import React from 'react'
import { G12Result } from "@/actions/g12"

interface G12PrintTemplateProps {
    data: G12Result
}

export const G12PrintTemplate: React.FC<G12PrintTemplateProps> = ({ data }) => {
    const t = data.tenant

    return (
        <div className="w-[210mm] min-h-[297mm] p-8 mx-auto bg-white text-black font-sans text-sm pb-20">
            {/* EN-TETE */}
            <div className="flex justify-between items-start mb-6">
                <div className="text-center text-xs font-bold leading-tight">
                    <p>RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE</p>
                    <p>MINISTÈRE DES FINANCES</p>
                    <p>DIRECTION GÉNÉRALE DES IMPÔTS</p>
                </div>
                <div className="text-center border-2 border-black p-2 font-bold text-lg">
                    SÉRIE G N° {data.mode === "previsionnel" ? "12" : "12 Bis"}
                </div>
            </div>

            <div className="text-center font-bold text-lg underline mb-6 uppercase">
                {data.mode === "previsionnel"
                    ? "DÉCLARATION PRÉVISIONNELLE DE L'IMPÔT FORFAITAIRE UNIQUE"
                    : "DÉCLARATION DÉFINITIVE DE L'IMPÔT FORFAITAIRE UNIQUE"}
            </div>

            <div className="flex justify-between mb-6 font-bold text-sm">
                <div>
                    WILAYA / COMMUNE : <span className="underline ml-2 uppercase">{t?.wilaya || ''} / {t?.commune || '____________________'}</span>
                </div>
                <div>
                    EXERCICE : <span className="underline ml-2">{data.year}</span>
                </div>
            </div>

            {/* IDENTIFICATION DU CONTRIBUABLE */}
            <div className="border border-black p-3 mb-6 relative">
                <div className="absolute -top-3 left-4 bg-white px-2 font-bold text-sm">CADRE RÉSERVÉ AU CONTRIBUABLE</div>

                <div className="grid grid-cols-12 gap-y-3 gap-x-4 mt-2">
                    <div className="col-span-12 flex gap-2">
                        <span className="font-bold whitespace-nowrap">Nom, Prénom ou Raison Sociale :</span>
                        <span className="border-b border-dotted border-black flex-1 uppercase">{t?.name || ''} {t?.ownerName ? `(${t.ownerName})` : ''}</span>
                    </div>

                    <div className="col-span-12 flex gap-2">
                        <span className="font-bold whitespace-nowrap">Adresse du local professionnel :</span>
                        <span className="border-b border-dotted border-black flex-1 uppercase">{t?.address || ''} {t?.commune || ''} {t?.wilaya || ''}</span>
                    </div>

                    <div className="col-span-12 flex gap-2">
                        <span className="font-bold whitespace-nowrap">Nature de l'Activité :</span>
                        <span className="border-b border-dotted border-black flex-1 uppercase">{t?.activity || 'NÉANT'}</span>
                    </div>

                    <div className="col-span-6 flex gap-2">
                        <span className="font-bold whitespace-nowrap">Téléphone :</span>
                        <span className="border-b border-dotted border-black flex-1">{t?.phone || ''}</span>
                    </div>
                    <div className="col-span-6 flex gap-2">
                        <span className="font-bold whitespace-nowrap">Fax / E-mail :</span>
                        <span className="border-b border-dotted border-black flex-1">{t?.email || ''}</span>
                    </div>

                    <div className="col-span-8 flex gap-2">
                        <span className="font-bold whitespace-nowrap">Numéro d'Identification Fiscale (N.I.F) :</span>
                        <div className="flex gap-1">
                            {(t?.nif || '                   ').padEnd(15, ' ').substring(0, 15).split('').map((char, i) => (
                                <div key={i} className="w-5 h-6 border border-black flex items-center justify-center text-xs font-mono font-bold">
                                    {char.trim() ? char : ''}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="col-span-4 flex gap-2 items-center">
                        <span className="font-bold whitespace-nowrap border-b-2 border-black w-full text-center">Taux Applicable : {data.ifuRate}%</span>
                    </div>

                    <div className="col-span-6 flex gap-2">
                        <span className="font-bold whitespace-nowrap">Numéro d'Article d'Imposition :</span>
                        <div className="flex gap-1">
                            {(t?.artImposition || '           ').padEnd(11, ' ').substring(0, 11).split('').map((char, i) => (
                                <div key={i} className="w-5 h-6 border border-black flex items-center justify-center text-xs font-mono font-bold">
                                    {char.trim() ? char : ''}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="col-span-6 flex gap-2">
                        <span className="font-bold whitespace-nowrap">Numéro de Registre de Commerce :</span>
                        <span className="border-b border-dotted border-black flex-1 uppercase font-mono">{t?.rc || ''}</span>
                    </div>
                </div>
            </div>

            {/* TABLEAU I: REPARTITION DU CHIFFRE D'AFFAIRES */}
            <div className="mb-2 font-bold">
                TABLEAU I : RÉPARTITION {data.mode === "previsionnel" ? "PRÉVISIONNELLE" : "DÉFINITIVE"} DU CHIFFRE D'AFFAIRES
            </div>
            <table className="w-full border-collapse border border-black mb-6 text-xs text-center">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-2 w-[20%]">PÉRIODICITÉ</th>
                        <th className="border border-black p-2 w-[40%]">CHIFFRE D'AFFAIRES HT (DA)</th>
                        <th className="border border-black p-2 w-[40%]">MONTANT IFU À VERSER (DA)</th>
                    </tr>
                </thead>
                <tbody>
                    {data.quarters.map((q) => (
                        <tr key={q.quarter}>
                            <td className="border border-black p-2 font-bold">{q.quarter}er Trimestre</td>
                            <td className="border border-black p-2 font-mono">{q.caHT.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="border border-black p-2 font-mono">{q.ifuAmount.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                    ))}
                    <tr className="bg-gray-50">
                        <td className="border border-black p-2 font-extrabold uppercase text-sm">TOTAL ANNUEL</td>
                        <td className="border border-black p-2 font-mono font-bold text-sm bg-gray-100">{data.totalCA.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="border border-black p-2 font-mono font-bold text-sm bg-gray-100">{data.totalIFU.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                </tbody>
            </table>

            {/* TABLEAU II: LIQUIDATION DE L'IMPOT */}
            <div className="mb-2 font-bold mt-8">
                TABLEAU II : LIQUIDATION DE L'IMPÔT FORFAITAIRE UNIQUE (IFU)
            </div>
            <table className="w-full border-collapse border border-black mb-6 text-xs text-center">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-2" rowSpan={2}>BASE IMPOSABLE (CA)</th>
                        <th className="border border-black p-2" colSpan={3}>TAUX APPLICABLES</th>
                        <th className="border border-black p-2" rowSpan={2}>MONTANT TOTAL IFU (DA)</th>
                    </tr>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-2">0,5%</th>
                        <th className="border border-black p-2">5%</th>
                        <th className="border border-black p-2">12%</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="border border-black p-4 font-mono font-bold text-sm">{data.totalCA.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="border border-black p-4">
                            {data.ifuRate === 0.5 ? "X" : ""}
                        </td>
                        <td className="border border-black p-4">
                            {data.ifuRate === 5 ? "X" : ""}
                        </td>
                        <td className="border border-black p-4">
                            {data.ifuRate === 12 ? "X" : ""}
                        </td>
                        <td className="border border-black p-4 font-mono font-extrabold text-sm">{data.totalIFU.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                </tbody>
            </table>

            {/* PROJECTION POUR PREVISIONNEL */}
            {data.mode === "previsionnel" && data.projectedCA && (
                <div className="mt-8 p-4 border-2 border-gray-400 border-dashed bg-gray-50 mb-6">
                    <p className="font-bold text-center underline mb-2">NOTE DE PROJECTION INTERNE (Non certifiée DGI)</p>
                    <p className="text-center">Basé sur une moyenne de <strong>{data.monthsElapsed} mois</strong> écoulé(s), votre Chiffre d'Affaires projeté en fin d'exercice est de : <span className="font-mono font-bold">{data.projectedCA.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA</span>.</p>
                </div>
            )}

            {/* ENGAGEMENT & SIGNATURE */}
            <div className="mt-12 p-4 border border-black">
                <p className="font-bold mb-4">Je soussigné(e), certifie exacts les renseignements figurant sur la présente déclaration.</p>

                <div className="flex justify-end mt-4 mb-16 pr-10">
                    <div className="text-center">
                        <p className="mb-2">A ..................................... , le ...............................</p>
                        <p className="font-bold">SIGNATURE ET CACHET DU M déclarant</p>
                    </div>
                </div>
            </div>

            <div className="text-[10px] text-gray-400 text-center mt-8">
                Généré automatiquement par SYNCLOUDPOS — La version web peut varier légèrement du feuillet imprimé certifié DGI.
            </div>
        </div>
    )
}
