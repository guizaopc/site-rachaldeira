'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, Search, Filter, X, Star, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Member {
    id: string;
    name: string;
    photo_url?: string;
    position?: string;
    age?: number;
    level?: number;
}

export default function MembersList({ initialMembers, currentUserRole }: { initialMembers: Member[], currentUserRole?: string | null }) {
    const [members, setMembers] = useState<Member[]>(initialMembers);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
    const [editingLevel, setEditingLevel] = useState<string | null>(null); // Member ID being edited
    const [loadingLevel, setLoadingLevel] = useState<string | null>(null);

    const canEdit = currentUserRole === 'admin' || currentUserRole === 'director';

    const handleLevelUpdate = async (memberId: string, newLevel: number) => {
        setLoadingLevel(memberId);
        const supabase = createClient();

        try {
            const { error } = await supabase
                .from('members')
                .update({ level: newLevel })
                .eq('id', memberId);

            if (error) throw error;

            toast.success("Nível atualizado com sucesso!");

            // Update local state
            setMembers(prev => prev.map(m =>
                m.id === memberId ? { ...m, level: newLevel } : m
            ));
            setEditingLevel(null);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao atualizar nível.");
        } finally {
            setLoadingLevel(null);
        }
    };


    // Get unique positions for filter
    const positions = useMemo(() => {
        const pos = new Set(members.map(m => m.position).filter(Boolean));
        return Array.from(pos).sort();
    }, [members]);

    // Filter members
    const filteredMembers = useMemo(() => {
        return members.filter(member => {
            const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesPosition = selectedPosition ? member.position === selectedPosition : true;
            return matchesSearch && matchesPosition;
        });
    }, [members, searchTerm, selectedPosition]);

    return (
        <div>
            {/* Filters Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 sticky top-4 z-10">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Search Input */}
                    <div className="relative w-full md:max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <Input
                            type="text"
                            placeholder="Buscar pereba por nome..."
                            className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Position Filters */}
                    <div className="w-full md:w-auto min-w-[200px]">
                        <select
                            className="flex h-12 w-full items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedPosition || ""}
                            onChange={(e) => setSelectedPosition(e.target.value === "" ? null : e.target.value)}
                        >
                            <option value="">Todas as posições</option>
                            {positions.map((pos) => (
                                <option key={pos} value={pos}>
                                    {pos as string}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Active Filters Summary (Optional, simple visual feedback) */}
                {(searchTerm || selectedPosition) && (
                    <div className="mt-4 text-sm text-gray-500 flex items-center gap-2 animate-fade-in">
                        <Filter size={14} />
                        <span>
                            Mostrando {filteredMembers.length} de {members.length} perebas
                            {selectedPosition && ` da posição "${selectedPosition}"`}
                            {searchTerm && ` com termo "${searchTerm}"`}
                        </span>
                        <button
                            onClick={() => { setSearchTerm(''); setSelectedPosition(null) }}
                            className="text-red-500 hover:underline ml-2 text-xs font-semibold"
                        >
                            Limpar Filtros
                        </button>
                    </div>
                )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredMembers.map((member) => (
                    <Link href={`/perfil/${member.id}`} key={member.id} className="group block h-full">
                        <Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-transparent hover:border-blue-100">
                            <CardContent className="p-0 flex flex-col h-full">
                                <div className="aspect-square relative bg-gray-100 group-hover:bg-blue-50 transition-colors">
                                    {member.photo_url ? (
                                        <Image
                                            src={member.photo_url}
                                            alt={member.name}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300 group-hover:text-blue-300 transition-colors">
                                            <User size={80} strokeWidth={1.5} />
                                        </div>
                                    )}
                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <span className="bg-white/90 text-gray-900 px-4 py-2 rounded-full text-sm font-semibold shadow-sm transform translate-y-4 group-hover:translate-y-0 transition-all">
                                            Ver Perfil
                                        </span>
                                    </div>
                                </div>
                                <div className="p-5 flex-1 flex flex-col justify-between bg-white">
                                    <div>
                                        <h3 className="font-bold text-xl text-gray-900 mb-1 group-hover:text-[#093a9f] transition-colors">
                                            {member.name}
                                        </h3>
                                        {member.position && (
                                            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                                                {member.position}
                                            </p>
                                        )}
                                    </div>

                                    {member.age && (
                                        <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
                                            <span>Idade</span>
                                            <span className="font-semibold text-gray-700">{member.age} anos</span>
                                        </div>
                                    )}

                                    {canEdit && (
                                        <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500 mt-2">
                                            <div className="flex items-center gap-1">
                                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                                <span>Nível</span>
                                            </div>

                                            <Select
                                                value={String(member.level || 1)}
                                                onValueChange={(val) => handleLevelUpdate(member.id, parseInt(val))}
                                                disabled={loadingLevel === member.id}
                                            >
                                                <SelectTrigger className="w-[60px] h-7 text-xs px-2">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[1, 2, 3, 4, 5].map(lvl => (
                                                        <SelectItem key={lvl} value={String(lvl)} className="text-xs">
                                                            {lvl}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {filteredMembers.length === 0 && (
                <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-100 mt-8">
                    <Search size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum pereba contrado</h3>
                    <p className="text-gray-500">Tente ajustar seus filtros de busca.</p>
                    <Button
                        variant="ghost"
                        onClick={() => { setSearchTerm(''); setSelectedPosition(null) }}
                        className="mt-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                        Limpar tudo
                    </Button>
                </div>
            )}
        </div>
    );
}
