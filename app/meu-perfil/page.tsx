'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NextImage from 'next/image';
import { Calendar, MapPin, User, Trophy, Target, Shield, Users, Upload, Save, Camera, Edit2 } from 'lucide-react';

const Label = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
    <label htmlFor={htmlFor} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {children}
    </label>
);

const POSITIONS = [
    { value: 'GOL', label: 'Goleiro' },
    { value: 'ZAG', label: 'Zagueiro' },
    { value: 'LD', label: 'Lateral Direito' },
    { value: 'LE', label: 'Lateral Esquerdo' },
    { value: 'VOL', label: 'Volante' },
    { value: 'MEI', label: 'Meia' },
    { value: 'PD', label: 'Ponta Direita' },
    { value: 'PE', label: 'Ponta Esquerda' },
    { value: 'ATA', label: 'Atacante' },
];

export default function UserProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [user, setUser] = useState<any>(null);
    const [member, setMember] = useState<any>(null);
    const [stats, setStats] = useState({
        goals: 0,
        assists: 0,
        difficult_saves: 0,
        participations: 0
    });

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        position: '',
        photo_url: '',
    });
    const [isEditing, setIsEditing] = useState(false);

    // Gallery upload state
    const [showGalleryUpload, setShowGalleryUpload] = useState(false);
    const [galleryFile, setGalleryFile] = useState<File | null>(null);
    const [galleryType, setGalleryType] = useState<'photo' | 'video'>('photo');
    const [galleryCaption, setGalleryCaption] = useState('');
    const [galleryUploading, setGalleryUploading] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUser(user);

            // Get profile to find member_id
            const { data: profile } = await supabase
                .from('profiles')
                .select('member_id, role')
                .eq('id', user.id)
                .single();

            let memberId = profile?.member_id;

            // If no member linked, try to find by email
            if (!memberId && user.email) {
                const { data: memberByEmail } = await supabase
                    .from('members')
                    .select('id')
                    .eq('email', user.email)
                    .maybeSingle();

                if (memberByEmail) {
                    console.log('Found unlinked member by email, auto-linking...');
                    memberId = memberByEmail.id;
                    // Auto-link
                    await supabase
                        .from('profiles')
                        .update({ member_id: memberId })
                        .eq('id', user.id);
                }
            }

            if (memberId) {
                // Get member details
                const { data: memberData } = await supabase
                    .from('members')
                    .select('*')
                    .eq('id', memberId)
                    .single();

                if (memberData) {
                    setMember(memberData);
                    setFormData({
                        name: memberData.name || '',
                        position: memberData.position || '',
                        photo_url: memberData.photo_url || '',
                    });

                    // Load stats
                    loadStats(memberId);
                }
            } else {
                // If no member found, pre-fill for creation
                setFormData(prev => ({
                    ...prev,
                    name: user.user_metadata?.name || user.email?.split('@')[0] || ''
                }));
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async (memberId: string) => {
        // 1. Buscar scouts de rachas (inclui ajustes manuais se o memberId estiver no racha de ajustes)
        const { data: rachaScouts } = await supabase
            .from('racha_scouts')
            .select('goals, assists, difficult_saves, attendance_count')
            .eq('member_id', memberId);

        // 2. Buscar presenças reais em rachas FECHADOS
        const { count: realParticipations } = await supabase
            .from('racha_attendance')
            .select(`
                id,
                rachas!inner (
                    status,
                    location
                )
            `, { count: 'exact', head: true })
            .eq('member_id', memberId)
            .eq('status', 'in')
            .eq('rachas.status', 'closed')
            .neq('rachas.location', 'Sistema (Manual)');

        let totalGoals = 0;
        let totalAssists = 0;
        let totalSaves = 0;
        let manualAttendance = 0;

        rachaScouts?.forEach(s => {
            totalGoals += s.goals || 0;
            totalAssists += s.assists || 0;
            totalSaves += s.difficult_saves || 0;
            manualAttendance += (s as any).attendance_count || 0;
        });

        setStats({
            goals: totalGoals,
            assists: totalAssists,
            difficult_saves: totalSaves,
            participations: (realParticipations || 0) + manualAttendance
        });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;

        setSaveStatus('saving');
        try {
            const { error: uploadError } = await supabase.storage
                .from('Fotos')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('Fotos')
                .getPublicUrl(fileName);

            setFormData(prev => ({ ...prev, photo_url: publicUrl }));
            setSaveStatus('idle');
        } catch (error: any) {
            console.error('Upload error:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    const handleSave = async () => {
        setSaveStatus('saving');

        try {
            if (member) {
                // Update existing member
                const { error } = await supabase
                    .from('members')
                    .update({
                        name: formData.name,
                        position: formData.position,
                        photo_url: formData.photo_url
                    })
                    .eq('id', member.id);

                if (error) throw error;
                setSaveStatus('success');
                setTimeout(() => setSaveStatus('idle'), 2000);
            } else {
                // No member linked
                if (!formData.name) {
                    setSaveStatus('error');
                    setTimeout(() => setSaveStatus('idle'), 2000);
                    return;
                }

                // 1. Check if member exists by email
                const { data: existingMember } = await supabase
                    .from('members')
                    .select('*')
                    .eq('email', user.email)
                    .maybeSingle();

                let targetMemberId;

                if (existingMember) {
                    targetMemberId = existingMember.id;
                    const { error: updateError } = await supabase
                        .from('members')
                        .update({
                            name: formData.name,
                            position: formData.position,
                            photo_url: formData.photo_url
                        })
                        .eq('id', targetMemberId);

                    if (updateError) throw updateError;
                } else {
                    const { data: newMember, error: createError } = await supabase
                        .from('members')
                        .insert({
                            name: formData.name,
                            position: formData.position,
                            photo_url: formData.photo_url,
                            email: user.email
                        })
                        .select()
                        .single();

                    if (createError) throw createError;
                    targetMemberId = newMember.id;
                }

                // 2. Link to profile
                const { error: linkError } = await supabase
                    .from('profiles')
                    .update({ member_id: targetMemberId })
                    .eq('id', user.id);

                if (linkError) throw linkError;

                // 3. Refresh
                const { data: finalMember } = await supabase
                    .from('members')
                    .select('*')
                    .eq('id', targetMemberId)
                    .single();

                setMember(finalMember);
                setSaveStatus('success');
                setTimeout(() => setSaveStatus('idle'), 2000);
                loadProfile();
            }
        } catch (error: any) {
            console.error('Save error:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    const handleGalleryUpload = async () => {
        if (!galleryFile || !user) return;

        setGalleryUploading(true);
        try {
            const fileExt = galleryFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;

            // Upload to storage
            console.log('Uploading to storage bucket "Fotos"...');
            const { error: uploadError } = await supabase.storage
                .from('Fotos')
                .upload(fileName, galleryFile);

            if (uploadError) {
                console.error('Storage upload error:', uploadError);
                throw new Error(`Erro no upload: ${uploadError.message}`);
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('Fotos')
                .getPublicUrl(fileName);

            console.log('Inserting into database...', { publicUrl, userId: user.id });

            // Insert into database
            const { error: insertError } = await supabase
                .from('gallery_media')
                .insert({
                    type: galleryType,
                    url: publicUrl,
                    caption: galleryCaption || null,
                    uploaded_by: user.id,
                });

            if (insertError) {
                console.error('Database insert error:', insertError);
                throw new Error(`Erro ao salvar no banco: ${insertError.message}`);
            }

            // Success!
            alert('✅ Mídia enviada com sucesso!');

            // Reset form
            setShowGalleryUpload(false);
            setGalleryFile(null);
            setGalleryCaption('');
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error: any) {
            console.error('Gallery upload error:', error);
            alert(error.message || 'Erro ao fazer upload');
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } finally {
            setGalleryUploading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Carregando perfil...</div>;

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 border-b-4 border-[#af1c15] inline-block pb-2">Meu Perfil</h1>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Left Column: Photo & Basic Info */}
                <Card className="md:col-span-1 border-none shadow-lg">
                    <CardContent className="pt-6 flex flex-col items-center text-center">
                        <div className="relative w-40 h-40 mb-4 group">
                            <div className="w-full h-full rounded-full overflow-hidden border-4 border-[#093a9f] bg-gray-100 relative">
                                {formData.photo_url ? (
                                    <NextImage
                                        src={formData.photo_url}
                                        alt={formData.name || 'User'}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <User size={64} />
                                    </div>
                                )}
                            </div>
                            {isEditing && (
                                <label className="absolute bottom-0 right-0 bg-[#af1c15] text-white p-2 rounded-full cursor-pointer hover:bg-red-700 transition-colors shadow-md">
                                    <Upload size={16} />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handlePhotoUpload}
                                        disabled={saveStatus === 'saving'}
                                    />
                                </label>
                            )}
                        </div>

                        <h2 className="text-xl font-bold text-gray-900">{formData.name || 'Seu Nome'}</h2>
                        <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-semibold mt-2 border border-gray-200">
                            {POSITIONS.find(p => p.value === formData.position)?.label || formData.position || 'Sem posição'}
                        </span>
                    </CardContent>
                </Card>

                {/* Right Column: Edit Form & Stats */}
                <div className="md:col-span-2 space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                            <CardContent className="p-4 text-center">
                                <div className="mb-1 flex justify-center text-2xl">⚽</div>
                                <div className="text-2xl font-bold text-gray-900">{stats.goals}</div>
                                <div className="text-xs text-gray-500 uppercase font-semibold">Gols</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
                            <CardContent className="p-4 text-center">
                                <div className="mb-1 flex justify-center text-2xl">👟</div>
                                <div className="text-2xl font-bold text-gray-900">{stats.assists}</div>
                                <div className="text-xs text-gray-500 uppercase font-semibold">Assist.</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-yellow-50 to-white border-yellow-100">
                            <CardContent className="p-4 text-center">
                                <div className="mb-1 flex justify-center text-2xl">🧤</div>
                                <div className="text-2xl font-bold text-gray-900">{stats.difficult_saves}</div>
                                <div className="text-xs text-gray-500 uppercase font-semibold">Defesas</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
                            <CardContent className="p-4 text-center">
                                <div className="mb-1 flex justify-center text-2xl">🙋‍♂️</div>
                                <div className="text-2xl font-bold text-gray-900">{stats.participations}</div>
                                <div className="text-xs text-gray-500 uppercase font-semibold">Jogos</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Edit Profile Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Informações do Perfil</CardTitle>
                                {!isEditing && (
                                    <Button
                                        onClick={() => setIsEditing(true)}
                                        variant="outline"
                                        size="sm"
                                    >
                                        <Edit2 size={16} className="mr-2" />
                                        Editar Perfil
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome Completo</Label>
                                {isEditing ? (
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Seu nome completo"
                                        disabled={saveStatus === 'saving'}
                                    />
                                ) : (
                                    <div className="px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                                        {formData.name || '-'}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="position">Posição Principal</Label>
                                {isEditing ? (
                                    <select
                                        id="position"
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={formData.position}
                                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                        disabled={saveStatus === 'saving'}
                                    >
                                        <option value="">Selecione...</option>
                                        {POSITIONS.map((pos) => (
                                            <option key={pos.value} value={pos.value}>
                                                {pos.label}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                                        {POSITIONS.find(p => p.value === formData.position)?.label || '-'}
                                    </div>
                                )}
                            </div>

                            {isEditing && (
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        onClick={async () => {
                                            await handleSave();
                                            if (saveStatus === 'success') {
                                                setIsEditing(false);
                                            }
                                        }}
                                        disabled={saveStatus === 'saving'}
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                        <Save size={18} className="mr-2" />
                                        {saveStatus === 'saving' ? 'Salvando...' : 'Salvar Alterações'}
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setIsEditing(false);
                                            loadProfile();
                                        }}
                                        variant="outline"
                                        disabled={saveStatus === 'saving'}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Gallery Upload */}
                    {member && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Camera size={20} />
                                    Galeria
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {!showGalleryUpload ? (
                                    <Button
                                        onClick={() => setShowGalleryUpload(true)}
                                        className="w-full bg-purple-600 hover:bg-purple-700"
                                    >
                                        <Upload size={18} className="mr-2" />
                                        Enviar Foto/Vídeo para Galeria
                                    </Button>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="gallery-type">Tipo</Label>
                                            <select
                                                id="gallery-type"
                                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={galleryType}
                                                onChange={(e) => setGalleryType(e.target.value as 'photo' | 'video')}
                                            >
                                                <option value="photo">Foto</option>
                                                <option value="video">Vídeo</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="gallery-file">Arquivo</Label>
                                            <Input
                                                id="gallery-file"
                                                type="file"
                                                accept={galleryType === 'photo' ? 'image/*' : 'video/*'}
                                                onChange={(e) => setGalleryFile(e.target.files?.[0] || null)}
                                                className="cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="gallery-caption">Legenda (opcional)</Label>
                                            <Input
                                                id="gallery-caption"
                                                value={galleryCaption}
                                                onChange={(e) => setGalleryCaption(e.target.value)}
                                                placeholder="Descrição da foto/vídeo"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleGalleryUpload}
                                                disabled={!galleryFile || galleryUploading}
                                                className="flex-1 bg-purple-600 hover:bg-purple-700"
                                            >
                                                {galleryUploading ? 'Enviando...' : 'Enviar'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setShowGalleryUpload(false);
                                                    setGalleryFile(null);
                                                    setGalleryCaption('');
                                                }}
                                                disabled={galleryUploading}
                                            >
                                                Cancelar
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
