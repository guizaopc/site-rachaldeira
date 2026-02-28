'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';

export function PrintModeToggle() {
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        if (isActive) {
            document.body.classList.add('print-mode-on');
        } else {
            document.body.classList.remove('print-mode-on');
        }

        return () => {
            document.body.classList.remove('print-mode-on');
        };
    }, [isActive]);

    return (
        <div className="no-print">
            <Button
                onClick={() => setIsActive(!isActive)}
                variant={isActive ? "danger" : "outline"}
                size="sm"
                className={`transition-all duration-300 font-bold gap-2 ${isActive ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
            >
                {isActive ? (
                    <><X size={16} /> Sair do Modo Print</>
                ) : (
                    <><Camera size={16} /> Modo Print / WhatsApp</>
                )}
            </Button>

            <style jsx global>{`
                /* Esconder a versão de print por padrão */
                .print-scouts-grid {
                    display: none !important;
                }

                /* Quando o Modo Print está ativo, afetamos APENAS a seção de scouts */
                body.print-mode-on .no-print-section {
                    display: none !important;
                }

                body.print-mode-on .print-scouts-grid {
                    display: grid !important;
                    grid-template-columns: repeat(4, 1fr) !important;
                    gap: 12px !important;
                    padding: 20px 0 !important;
                    animation: fadeIn 0.3s ease-out;
                }

                @media (max-width: 1200px) {
                    body.print-mode-on .print-scouts-grid {
                        grid-template-columns: repeat(3, 1fr) !important;
                    }
                }

                @media (max-width: 900px) {
                    body.print-mode-on .print-scouts-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                }

                @media (max-width: 600px) {
                    body.print-mode-on .print-scouts-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                        gap: 8px !important;
                        padding: 10px !important;
                    }

                    body.print-mode-on .scout-print-item {
                        padding: 8px 10px !important;
                        gap: 4px !important;
                    }

                    body.print-mode-on .scout-member-name {
                        font-size: 12px !important;
                        max-width: 70px !important;
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                        white-space: nowrap !important;
                    }

                    body.print-mode-on .scout-stats-badge {
                        padding: 2px 6px !important;
                        font-size: 11px !important;
                    }

                    body.print-mode-on .print-scouts-card {
                        padding: 1.5rem 1rem !important;
                    }

                    body.print-mode-on .flex-center-title {
                        font-size: 1.25rem !important;
                        margin-bottom: 1rem !important;
                    }
                }

                /* Estilo dos cards (horizontal) */
                body.print-mode-on .scout-print-item {
                    background: white !important;
                    border-radius: 12px !important;
                    padding: 12px 16px !important;
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    border: 1px solid #e2e8f0 !important;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05) !important;
                }

                body.print-mode-on .scout-member-name {
                    font-weight: 800 !important;
                    color: #0f172a !important;
                    font-size: 14px !important;
                    line-height: 1.2 !important;
                }

                body.print-mode-on .scout-stats-badge {
                    padding: 4px 8px !important;
                    border-radius: 6px !important;
                    font-weight: 900 !important;
                    font-size: 14px !important;
                }

                /* Efeito suave de entrada */
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* NÃO esconder o resto da página, apenas mudar o visual da tabela */
                body.print-mode-on .print-scouts-card {
                    background: #f8fafc !important; /* Um fundo leve para destacar a área de print */
                    border: 2px solid #3b82f6 !important;
                }

                body.print-mode-on .flex-center-title {
                    border-bottom: 2px solid #e2e8f0 !important;
                    padding-bottom: 1rem !important;
                }
            `}</style>
        </div>
    );
}
