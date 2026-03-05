import React from 'react'
import { G50Result } from "@/actions/g50"

interface G50PrintTemplateProps {
    data: G50Result
}

export const G50PrintTemplate: React.FC<G50PrintTemplateProps> = ({ data }) => {
    const t = data.tenant

    return (
        <div className="w-[210mm] min-h-[297mm] p-8 mx-auto bg-white text-black font-sans text-sm print-only-block" style={{ display: 'none' }}>
            {/* EN-TETE */}
            <div className="flex justify-between items-start mb-6">
                <div className="text-center text-xs font-bold leading-tight">
                    <p>RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE</p>
                    <p>MINISTÈRE DES FINANCES</p>
                    <p>DIRECTION GÉNÉRALE DES IMPÔTS</p>
                </div>
                <div className="text-center border-2 border-black p-2 font-bold text-lg">
                    SÉRIE G N° 50
                </div>
            </div>

            <div className="text-center font-bold text-lg underline mb-6">
                DÉCLARATION TENANT LIEU DE BORDEREAU D'AVIS DE VERSEMENT
            </div>

            <div className="flex justify-between mb-6 font-bold text-sm">
                <div>
                    RECETTE DES IMPÔTS DE : <span className="underline ml-2">{t?.commune || '____________________'}</span>
                </div>
                <div>
                    MOIS DE : <span className="underline ml-2 uppercase">{data.period}</span>
                </div>
            </div>

            {/* IDENTIFICATION DU CONTRIBUABLE */}
            <div className="border border-black p-3 mb-6 relative">
                <div className="absolute -top-3 left-4 bg-white px-2 font-bold text-sm">IDENTIFICATION DU CONTRIBUABLE</div>

                <div className="grid grid-cols-12 gap-y-3 gap-x-4 mt-2">
                    <div className="col-span-12 flex gap-2">
                        <span className="font-bold whitespace-nowrap">Nom, Prénom ou Raison Sociale :</span>
                        <span className="border-b border-dotted border-black flex-1 uppercase">{t?.name || ''} {t?.ownerName ? `(${t.ownerName})` : ''}</span>
                    </div>

                    <div className="col-span-12 flex gap-2">
                        <span className="font-bold whitespace-nowrap">Adresse :</span>
                        <span className="border-b border-dotted border-black flex-1 uppercase">{t?.address || ''} {t?.commune || ''} {t?.wilaya || ''}</span>
                    </div>

                    <div className="col-span-12 flex gap-2">
                        <span className="font-bold whitespace-nowrap">Activité Principal :</span>
                        <span className="border-b border-dotted border-black flex-1 uppercase">{t?.activity || 'NÉANT'}</span>
                    </div>

                    <div className="col-span-6 flex gap-2">
                        <span className="font-bold whitespace-nowrap">NIF :</span>
                        <div className="flex gap-1">
                            {(t?.nif || '                   ').padEnd(15, ' ').substring(0, 15).split('').map((char, i) => (
                                <div key={i} className="w-5 h-6 border border-black flex items-center justify-center text-xs font-mono font-bold">
                                    {char.trim() ? char : ''}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="col-span-6 flex gap-2">
                        <span className="font-bold whitespace-nowrap">N° Article d'Imposition :</span>
                        <div className="flex gap-1">
                            {(t?.artImposition || '           ').padEnd(11, ' ').substring(0, 11).split('').map((char, i) => (
                                <div key={i} className="w-5 h-6 border border-black flex items-center justify-center text-xs font-mono font-bold">
                                    {char.trim() ? char : ''}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="col-span-6 flex gap-2">
                        <span className="font-bold whitespace-nowrap">Registre de Commerce :</span>
                        <span className="border-b border-dotted border-black flex-1 uppercase font-mono">{t?.rc || ''}</span>
                    </div>

                    <div className="col-span-6 flex gap-2">
                        <span className="font-bold whitespace-nowrap">Email / Tél :</span>
                        <span className="border-b border-dotted border-black flex-1">{t?.email || ''} {t?.phone || ''}</span>
                    </div>
                </div>
            </div>

            {/* SECTION TAXES */}
            <div className="mb-2 font-bold text-center bg-gray-200 border border-black p-1">
                PAIEMENT PAR ACOMPTE ET DÉCLARATION DES TAXES CA (TVA)
            </div>

            <table className="w-full border-collapse border border-black mb-6 text-xs">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-2 w-[40%] text-left">NATURE LÉGALE DES IMPÔTS ET TAXES</th>
                        <th className="border border-black p-2 w-[20%] text-center">CHIFFRE D'AFFAIRES INITIAL (DA)</th>
                        <th className="border border-black p-2 w-[10%] text-center">TAUX</th>
                        <th className="border border-black p-2 w-[30%] text-center">MONTANT DES DROITS (DA)</th>
                    </tr>
                </thead>
                <tbody>
                    {/* TVA Section */}
                    <tr>
                        <td className="border border-black p-2 font-bold bg-gray-50 uppercase" colSpan={4}>TAXE SUR LA VALEUR AJOUTÉE (T.V.A.)</td>
                    </tr>

                    {data.rows.map((row) => (
                        <tr key={row.rate}>
                            <td className="border border-black p-2 pl-4">Opérations Imposables à {row.rate}%</td>
                            <td className="border border-black p-2 text-right font-mono">{row.baseHT > 0 ? row.baseHT.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                            <td className="border border-black p-2 text-center">{row.rate}%</td>
                            <td className="border border-black p-2 text-right font-mono font-bold">{row.tvaAmount > 0 ? row.tvaAmount.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                        </tr>
                    ))}

                    {/* Exonerated / Exempted - Just for form completeness */}
                    <tr>
                        <td className="border border-black p-2 pl-4">Opérations Exonérées ou Sans TVA</td>
                        <td className="border border-black p-2 text-right font-mono text-gray-400">0,00</td>
                        <td className="border border-black p-2 text-center bg-gray-100"></td>
                        <td className="border border-black p-2 text-center bg-gray-100"></td>
                    </tr>

                    <tr>
                        <td className="border border-black p-2 font-bold text-right" colSpan={3}>TOTAL TVA BRUTE (A)</td>
                        <td className="border border-black p-2 text-right font-mono font-bold bg-gray-50">{data.grandTVA.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 pl-4" colSpan={3}>DÉDUCTIONS À OPÉRER (B) (TVA sur Achats)</td>
                        <td className="border border-black p-2 text-right font-mono text-gray-400">0,00</td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 font-bold text-right" colSpan={3}>PRECOMPTE DU MOIS PRÉCÉDENT (C)</td>
                        <td className="border border-black p-2 text-right font-mono text-gray-400">0,00</td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 font-bold text-right" colSpan={3}>TVA À PAYER (A - B - C)</td>
                        <td className="border border-black p-2 text-right font-mono font-extrabold text-lg">{data.grandTVA.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>

                    {/* OTHER TAXES (Empty placeholders to match DGI structure) */}
                    <tr>
                        <td className="border border-black p-2 font-bold bg-gray-50 uppercase" colSpan={4}>AUTRES TAXES ET DROITS DE TIMBRE</td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 pl-4">IBS / Acomptes provisionnels</td>
                        <td className="border border-black p-2 text-center bg-gray-100"></td>
                        <td className="border border-black p-2 text-center bg-gray-100"></td>
                        <td className="border border-black p-2 text-right font-mono text-gray-400">0,00</td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 pl-4">IRG / Salaires</td>
                        <td className="border border-black p-2 text-center bg-gray-100"></td>
                        <td className="border border-black p-2 text-center bg-gray-100"></td>
                        <td className="border border-black p-2 text-right font-mono text-gray-400">0,00</td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 pl-4">Droits de Timbre</td>
                        <td className="border border-black p-2 text-center bg-gray-100"></td>
                        <td className="border border-black p-2 text-center bg-gray-100"></td>
                        <td className="border border-black p-2 text-right font-mono text-gray-400">0,00</td>
                    </tr>

                    <tr>
                        <td className="border border-black p-3 font-extrabold text-right text-base" colSpan={3}>TOTAL GÉNÉRAL À PAYER</td>
                        <td className="border border-black p-3 text-right font-mono font-extrabold text-lg uppercase bg-gray-100">{data.grandTVA.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                </tbody>
            </table>

            {/* TOTAL EN LETTRES */}
            <div className="mb-10 text-sm">
                Arrêter le présent bordereau à la somme de :
                <div className="border border-black p-2 mt-2 h-16 italic text-gray-600 bg-gray-50">
                    (Écrire le montant en toutes lettres)
                    <br />
                    ..........................................................................................................................................................................................
                </div>
            </div>

            {/* SIGNATURE */}
            <div className="flex justify-end mt-12 mb-20 pr-10">
                <div className="text-center">
                    <p className="mb-2">A ..................................... , le ...............................</p>
                    <p className="font-bold underline">CACHET ET SIGNATURE</p>
                </div>
            </div>

            <div className="text-[10px] text-gray-400 text-center mt-8">
                Généré automatiquement par SYNCLOUDPOS — La version web peut varier légèrement du feuillet imprimé certifié DGI.
            </div>
        </div>
    )
}
