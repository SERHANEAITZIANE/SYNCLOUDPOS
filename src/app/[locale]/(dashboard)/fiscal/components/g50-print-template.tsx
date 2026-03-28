import React from 'react'
import { G50Result } from "@/actions/g50"

interface G50PrintTemplateProps {
    data: G50Result
}

function fmt(n: number) {
    return new Intl.NumberFormat("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function NifBoxes({ value, count = 15 }: { value: string | null | undefined; count?: number }) {
    const chars = (value || '').padEnd(count, ' ').substring(0, count).split('')
    return (
        <div className="flex gap-0">
            {chars.map((char, i) => (
                <div key={i} className="w-[18px] h-[22px] border border-black flex items-center justify-center text-[11px] font-mono font-bold leading-none">
                    {char.trim() || '\u00A0'}
                </div>
            ))}
        </div>
    )
}

export const G50PrintTemplate: React.FC<G50PrintTemplateProps> = ({ data }) => {
    const t = data.tenant
    const row19 = data.rows.find(r => r.rate === 19)
    const row9 = data.rows.find(r => r.rate === 9)
    const row0 = data.rows.find(r => r.rate === 0)

    const totalTvaBrute = data.grandTVA
    const deductions = data.totalDeductibleTVA
    const precompte = 0
    const tvaAPayer = data.netTVA

    return (
        <div className="w-[210mm] min-h-[297mm] mx-auto bg-white text-black font-serif" style={{ fontSize: '10.5px', padding: '8mm 10mm', lineHeight: '1.35' }}>

            {/* ────────── EN-TÊTE OFFICIEL ────────── */}
            <table className="w-full mb-1" style={{ borderCollapse: 'collapse' }}>
                <tbody>
                    <tr>
                        <td style={{ width: '60%', verticalAlign: 'top' }}>
                            <div className="leading-tight font-bold text-[10px]">
                                <p>الجمهورية الجزائرية الديمقراطية الشعبية</p>
                                <p className="mt-0.5">RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE</p>
                                <p className="mt-1">وزارة المالية</p>
                                <p>MINISTÈRE DES FINANCES</p>
                                <p className="mt-1">المديرية العامة للضرائب</p>
                                <p>DIRECTION GÉNÉRALE DES IMPÔTS</p>
                            </div>
                        </td>
                        <td style={{ width: '40%', verticalAlign: 'top', textAlign: 'right' }}>
                            <div className="border-2 border-black p-2 inline-block" style={{ minWidth: '160px', textAlign: 'center' }}>
                                <p className="font-bold text-[14px]">SÉRIE G N° 50</p>
                                <p className="text-[9px] mt-0.5 font-bold">سلسلة ج رقم 50</p>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div className="text-center font-bold text-[12px] border-y-2 border-black py-1.5 mb-2">
                DÉCLARATION TENANT LIEU DE BORDEREAU - AVIS DE VERSEMENT
                <br />
                <span className="text-[9px]">تصريح يقوم مقام جدول - إشعار بالدفع</span>
            </div>

            {/* Période */}
            <div className="flex justify-between mb-2 text-[10px] font-bold">
                <div className="flex gap-1">
                    <span>Recette des impôts de :</span>
                    <span className="border-b border-dotted border-black px-2 min-w-[140px] uppercase">{t?.commune || ''}</span>
                </div>
                <div className="flex gap-1">
                    <span>Mois de :</span>
                    <span className="border-b border-dotted border-black px-2 min-w-[120px] uppercase">{data.period}</span>
                </div>
            </div>

            {/* ────────── CADRE I : IDENTIFICATION DU CONTRIBUABLE ────────── */}
            <div className="border-2 border-black p-2 mb-2 relative">
                <div className="absolute -top-2.5 left-3 bg-white px-1 text-[9px] font-bold">CADRE I : IDENTIFICATION DU CONTRIBUABLE — الإطار الأول : هوية المكلف بالضريبة</div>

                <table className="w-full mt-1" style={{ borderCollapse: 'collapse', fontSize: '10px' }}>
                    <tbody>
                        <tr>
                            <td className="py-1">
                                <span className="font-bold">Nom, Prénom ou Raison Sociale : </span>
                                <span className="border-b border-dotted border-black inline-block min-w-[300px] uppercase">{t?.name || ''} {t?.ownerName ? `(${t.ownerName})` : ''}</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="py-1">
                                <span className="font-bold">Adresse de l&apos;activité : </span>
                                <span className="border-b border-dotted border-black inline-block min-w-[350px] uppercase">{t?.address || ''} {t?.commune || ''} {t?.wilaya || ''}</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="py-1">
                                <span className="font-bold">Activité exercée : </span>
                                <span className="border-b border-dotted border-black inline-block min-w-[250px] uppercase">{t?.activity || 'COMMERCE DE DÉTAIL'}</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="py-1">
                                <div className="flex flex-wrap gap-x-6 gap-y-1 items-center">
                                    <div className="flex items-center gap-1">
                                        <span className="font-bold">N.I.F :</span>
                                        <NifBoxes value={t?.nif} count={15} />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-bold">Article :</span>
                                        <NifBoxes value={t?.artImposition} count={13} />
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td className="py-1">
                                <div className="flex flex-wrap gap-x-6 gap-y-1 items-center">
                                    <div className="flex items-center gap-1">
                                        <span className="font-bold">N.I.S :</span>
                                        <NifBoxes value={t?.nis} count={18} />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-bold">R.C :</span>
                                        <span className="border-b border-dotted border-black inline-block min-w-[120px] font-mono text-[10px]">{t?.rc || ''}</span>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ────────── CADRE II : DÉCLARATION DES TAXES ────────── */}
            <div className="border-2 border-black mb-2">
                <div className="bg-gray-200 border-b-2 border-black text-center font-bold py-1 text-[10px]">
                    CADRE II : DÉCLARATION - LIQUIDATION DES IMPÔTS ET TAXES
                </div>

                <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '9.5px' }}>
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-1 text-center w-[30px]">N°</th>
                            <th className="border border-black p-1 text-left" style={{ width: '42%' }}>NATURE DES IMPÔTS ET TAXES</th>
                            <th className="border border-black p-1 text-center" style={{ width: '18%' }}>BASE IMPOSABLE<br />(DA)</th>
                            <th className="border border-black p-1 text-center w-[45px]">TAUX<br />(%)</th>
                            <th className="border border-black p-1 text-center" style={{ width: '18%' }}>DROITS<br />(DA)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* ── SECTION A : TVA ── */}
                        <tr className="bg-gray-50">
                            <td className="border border-black p-1 text-center font-bold" colSpan={5}>
                                A — TAXE SUR LA VALEUR AJOUTÉE (T.V.A.) — الرسم على القيمة المضافة
                            </td>
                        </tr>
                        {/* Row 1 - TVA 19% */}
                        <tr>
                            <td className="border border-black p-1 text-center">01</td>
                            <td className="border border-black p-1 pl-2">Ventes et prestations de services imposables au taux normal</td>
                            <td className="border border-black p-1 text-right font-mono">{fmt(row19?.baseHT || 0)}</td>
                            <td className="border border-black p-1 text-center font-bold">19</td>
                            <td className="border border-black p-1 text-right font-mono font-bold">{fmt(row19?.tvaAmount || 0)}</td>
                        </tr>
                        {/* Row 2 - TVA 9% */}
                        <tr>
                            <td className="border border-black p-1 text-center">02</td>
                            <td className="border border-black p-1 pl-2">Ventes et prestations de services imposables au taux réduit</td>
                            <td className="border border-black p-1 text-right font-mono">{fmt(row9?.baseHT || 0)}</td>
                            <td className="border border-black p-1 text-center font-bold">9</td>
                            <td className="border border-black p-1 text-right font-mono font-bold">{fmt(row9?.tvaAmount || 0)}</td>
                        </tr>
                        {/* Row 3 - Exonérées */}
                        <tr>
                            <td className="border border-black p-1 text-center">03</td>
                            <td className="border border-black p-1 pl-2">Opérations exonérées</td>
                            <td className="border border-black p-1 text-right font-mono text-gray-400">{fmt(row0?.baseHT || 0)}</td>
                            <td className="border border-black p-1 text-center bg-gray-100">—</td>
                            <td className="border border-black p-1 text-center bg-gray-100">—</td>
                        </tr>
                        {/* Row 4 - Chiffre d'affaires Total */}
                        <tr className="bg-gray-50">
                            <td className="border border-black p-1 text-center">04</td>
                            <td className="border border-black p-1 pl-2 font-bold">CHIFFRE D&apos;AFFAIRES TOTAL RÉALISÉ (01+02+03)</td>
                            <td className="border border-black p-1 text-right font-mono font-bold">{fmt(data.grandHT)}</td>
                            <td className="border border-black p-1 bg-gray-100"></td>
                            <td className="border border-black p-1 bg-gray-100"></td>
                        </tr>
                        {/* Row 5 - Total TVA Brute */}
                        <tr className="bg-blue-50">
                            <td className="border border-black p-1 text-center font-bold">05</td>
                            <td className="border border-black p-1 font-bold text-right pr-2">TOTAL T.V.A. COLLECTÉE (A)</td>
                            <td className="border border-black p-1 bg-gray-100"></td>
                            <td className="border border-black p-1 bg-gray-100"></td>
                            <td className="border border-black p-1 text-right font-mono font-bold">{fmt(totalTvaBrute)}</td>
                        </tr>
                        {/* Row 6 - TVA Déductible */}
                        <tr>
                            <td className="border border-black p-1 text-center">06</td>
                            <td className="border border-black p-1 pl-2">T.V.A. déductible sur achats (B)</td>
                            <td className="border border-black p-1 bg-gray-100"></td>
                            <td className="border border-black p-1 bg-gray-100"></td>
                            <td className="border border-black p-1 text-right font-mono">{fmt(deductions)}</td>
                        </tr>
                        {/* Row 7 - Précompte */}
                        <tr>
                            <td className="border border-black p-1 text-center">07</td>
                            <td className="border border-black p-1 pl-2">Précompte (Crédit du mois précédent) (C)</td>
                            <td className="border border-black p-1 bg-gray-100"></td>
                            <td className="border border-black p-1 bg-gray-100"></td>
                            <td className="border border-black p-1 text-right font-mono text-gray-400">0,00</td>
                        </tr>
                        {/* Row 8 - TVA nette */}
                        <tr className="bg-blue-50">
                            <td className="border border-black p-1 text-center font-bold">08</td>
                            <td className="border border-black p-1 font-bold text-right pr-2">T.V.A. À PAYER (A) − (B) − (C)</td>
                            <td className="border border-black p-1 bg-gray-100"></td>
                            <td className="border border-black p-1 bg-gray-100"></td>
                            <td className="border border-black p-1 text-right font-mono font-extrabold text-[11px]">{fmt(tvaAPayer)}</td>
                        </tr>

                        {/* ── SECTION B : TAP ── */}
                        <tr className="bg-gray-50">
                            <td className="border border-black p-1 text-center font-bold" colSpan={5}>
                                B — TAXE SUR L&apos;ACTIVITÉ PROFESSIONNELLE (T.A.P.) — الرسم على النشاط المهني
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 text-center">09</td>
                            <td className="border border-black p-1 pl-2">Chiffre d&apos;affaires taxable</td>
                            <td className="border border-black p-1 text-right font-mono">{fmt(data.grandHT)}</td>
                            <td className="border border-black p-1 text-center font-bold">{data.tapRate}</td>
                            <td className="border border-black p-1 text-right font-mono font-bold">{fmt(data.tapAmount)}</td>
                        </tr>

                        {/* ── SECTION C : IRG ── */}
                        <tr className="bg-gray-50">
                            <td className="border border-black p-1 text-center font-bold" colSpan={5}>
                                C — I.R.G. — TRAITEMENTS ET SALAIRES / RETENUES À LA SOURCE
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 text-center">10</td>
                            <td className="border border-black p-1 pl-2">I.R.G. / Traitements et salaires</td>
                            <td className="border border-black p-1 text-right font-mono text-gray-400">0,00</td>
                            <td className="border border-black p-1 text-center bg-gray-100">—</td>
                            <td className="border border-black p-1 text-right font-mono text-gray-400">0,00</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 text-center">11</td>
                            <td className="border border-black p-1 pl-2">I.R.G. / Revenus des capitaux mobiliers (RCM)</td>
                            <td className="border border-black p-1 text-right font-mono text-gray-400">0,00</td>
                            <td className="border border-black p-1 text-center bg-gray-100">—</td>
                            <td className="border border-black p-1 text-right font-mono text-gray-400">0,00</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 text-center">12</td>
                            <td className="border border-black p-1 pl-2">Retenue à la source / Fournisseurs</td>
                            <td className="border border-black p-1 text-right font-mono">{fmt(data.totalWithholding)}</td>
                            <td className="border border-black p-1 text-center bg-gray-100">—</td>
                            <td className="border border-black p-1 text-right font-mono font-bold">{fmt(data.totalWithholding)}</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 text-center">13</td>
                            <td className="border border-black p-1 pl-2">Retenue à la source / Loyers</td>
                            <td className="border border-black p-1 text-right font-mono text-gray-400">0,00</td>
                            <td className="border border-black p-1 text-center bg-gray-100">—</td>
                            <td className="border border-black p-1 text-right font-mono text-gray-400">0,00</td>
                        </tr>

                        {/* ── SECTION D : IBS ── */}
                        <tr className="bg-gray-50">
                            <td className="border border-black p-1 text-center font-bold" colSpan={5}>
                                D — IMPÔT SUR LES BÉNÉFICES DES SOCIÉTÉS (I.B.S.)
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 text-center">14</td>
                            <td className="border border-black p-1 pl-2">Acomptes provisionnels (1er, 2ème, 3ème)</td>
                            <td className="border border-black p-1 text-right font-mono text-gray-400">0,00</td>
                            <td className="border border-black p-1 text-center bg-gray-100">—</td>
                            <td className="border border-black p-1 text-right font-mono text-gray-400">0,00</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 text-center">15</td>
                            <td className="border border-black p-1 pl-2">Solde de liquidation</td>
                            <td className="border border-black p-1 text-right font-mono text-gray-400">0,00</td>
                            <td className="border border-black p-1 text-center bg-gray-100">—</td>
                            <td className="border border-black p-1 text-right font-mono text-gray-400">0,00</td>
                        </tr>

                        {/* ── SECTION E : DROITS DE TIMBRE & AUTRES ── */}
                        <tr className="bg-gray-50">
                            <td className="border border-black p-1 text-center font-bold" colSpan={5}>
                                E — DROITS DE TIMBRE ET AUTRES TAXES
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 text-center">16</td>
                            <td className="border border-black p-1 pl-2">Droits de timbre</td>
                            <td className="border border-black p-1 bg-gray-100"></td>
                            <td className="border border-black p-1 bg-gray-100"></td>
                            <td className="border border-black p-1 text-right font-mono font-bold">{fmt(data.totalTimbre)}</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 text-center">17</td>
                            <td className="border border-black p-1 pl-2">Taxe de formation professionnelle et d&apos;apprentissage</td>
                            <td className="border border-black p-1 text-right font-mono text-gray-400">0,00</td>
                            <td className="border border-black p-1 text-center text-gray-400">1</td>
                            <td className="border border-black p-1 text-right font-mono text-gray-400">0,00</td>
                        </tr>

                        {/* ── TOTAL GÉNÉRAL ── */}
                        <tr className="bg-gray-300">
                            <td className="border-2 border-black p-1.5 text-center font-extrabold" colSpan={2}>
                                TOTAL GÉNÉRAL À PAYER (المبلغ الإجمالي الواجب دفعه)
                            </td>
                            <td className="border-2 border-black p-1.5 bg-gray-200"></td>
                            <td className="border-2 border-black p-1.5 bg-gray-200"></td>
                            <td className="border-2 border-black p-1.5 text-right font-mono font-extrabold text-[13px]">{fmt(data.totalTaxDue)}</td>
                        </tr>

                        {/* ── PÉNALITÉS ── */}
                        <tr>
                            <td className="border border-black p-1 text-center">18</td>
                            <td className="border border-black p-1 pl-2">Pénalités de retard (10% — 25%)</td>
                            <td className="border border-black p-1 bg-gray-100"></td>
                            <td className="border border-black p-1 bg-gray-100"></td>
                            <td className="border border-black p-1 text-right font-mono text-gray-400">0,00</td>
                        </tr>
                        <tr className="bg-gray-200">
                            <td className="border-2 border-black p-1.5 text-center font-extrabold" colSpan={4}>
                                MONTANT NET À PAYER (Total + Pénalités)
                            </td>
                            <td className="border-2 border-black p-1.5 text-right font-mono font-extrabold text-[13px]">{fmt(data.totalTaxDue)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ────────── CADRE III : MONTANT EN LETTRES ────────── */}
            <div className="border-2 border-black p-2 mb-2">
                <p className="font-bold text-[9px] mb-1">Arrêté le présent bordereau à la somme de (en toutes lettres) :</p>
                <div className="border border-gray-400 p-1.5 min-h-[28px] bg-gray-50 italic text-gray-500 text-[9px]">
                    ............................................................................................................................................................................................................
                </div>
            </div>

            {/* ────────── CADRE IV : MODE DE PAIEMENT ────────── */}
            <div className="border-2 border-black p-2 mb-2">
                <p className="font-bold text-[9px] mb-1">Mode de règlement :</p>
                <div className="flex gap-6 text-[9px]">
                    <label className="flex items-center gap-1">
                        <span className="w-3 h-3 border border-black inline-block"></span> Espèces
                    </label>
                    <label className="flex items-center gap-1">
                        <span className="w-3 h-3 border border-black inline-block"></span> Chèque bancaire
                    </label>
                    <label className="flex items-center gap-1">
                        <span className="w-3 h-3 border border-black inline-block"></span> Virement
                    </label>
                    <label className="flex items-center gap-1">
                        <span className="w-3 h-3 border border-black inline-block"></span> Mandat CCP
                    </label>
                </div>
            </div>

            {/* ────────── SIGNATURE ────────── */}
            <div className="flex justify-between items-start mt-2">
                <div className="text-[9px] border-2 border-black p-2" style={{ width: '45%' }}>
                    <p className="font-bold mb-1 text-center border-b border-black pb-1">CADRE RÉSERVÉ À L&apos;ADMINISTRATION</p>
                    <p className="mt-6 text-center">Cachet et visa du Receveur</p>
                    <div className="h-[50px]"></div>
                </div>
                <div className="text-[9px] text-center" style={{ width: '45%' }}>
                    <p className="mb-1">A .................... , le ...... / ...... / {new Date().getFullYear()}</p>
                    <p className="font-bold mt-1 mb-1">SIGNATURE ET CACHET DU DÉCLARANT</p>
                    <div className="h-[50px]"></div>
                </div>
            </div>

            <div className="text-[8px] text-gray-400 text-center mt-3 border-t border-gray-200 pt-1">
                Document généré automatiquement par SYNCLOUDPOS — Conforme au modèle officiel Série G N°50 de la DGI
            </div>
        </div>
    )
}
