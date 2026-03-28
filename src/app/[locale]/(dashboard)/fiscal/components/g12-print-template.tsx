import React from 'react'
import { G12Result } from "@/actions/g12"

interface G12PrintTemplateProps {
    data: G12Result
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

const QUARTER_LABELS = [
    { label: "1er Trimestre (Janvier — Mars)", ar: "الفصل الأول" },
    { label: "2ème Trimestre (Avril — Juin)", ar: "الفصل الثاني" },
    { label: "3ème Trimestre (Juillet — Septembre)", ar: "الفصل الثالث" },
    { label: "4ème Trimestre (Octobre — Décembre)", ar: "الفصل الرابع" },
]

export const G12PrintTemplate: React.FC<G12PrintTemplateProps> = ({ data }) => {
    const t = data.tenant

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
                                <p className="font-bold text-[14px]">SÉRIE G N° {data.mode === "previsionnel" ? "12" : "12 Bis"}</p>
                                <p className="text-[9px] mt-0.5 font-bold">سلسلة ج رقم {data.mode === "previsionnel" ? "12" : "12 مكرر"}</p>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div className="text-center font-bold text-[12px] border-y-2 border-black py-1.5 mb-2 uppercase">
                {data.mode === "previsionnel"
                    ? "DÉCLARATION PRÉVISIONNELLE DE L'IMPÔT FORFAITAIRE UNIQUE (I.F.U.)"
                    : "DÉCLARATION COMPLÉMENTAIRE ET DÉFINITIVE DE L'IMPÔT FORFAITAIRE UNIQUE (I.F.U.)"}
                <br />
                <span className="text-[9px]">
                    {data.mode === "previsionnel"
                        ? "التصريح التقديري للضريبة الجزافية الوحيدة"
                        : "التصريح التكميلي والنهائي للضريبة الجزافية الوحيدة"}
                </span>
            </div>

            {/* Période */}
            <div className="flex justify-between mb-2 text-[10px] font-bold">
                <div className="flex gap-1">
                    <span>Wilaya / Commune :</span>
                    <span className="border-b border-dotted border-black px-2 min-w-[160px] uppercase">{t?.wilaya || ''} / {t?.commune || ''}</span>
                </div>
                <div className="flex gap-1">
                    <span>Exercice (السنة المالية) :</span>
                    <span className="border-b border-dotted border-black px-2 min-w-[60px] text-center">{data.year}</span>
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
                                <span className="font-bold">Adresse du local professionnel : </span>
                                <span className="border-b border-dotted border-black inline-block min-w-[320px] uppercase">{t?.address || ''} {t?.commune || ''} {t?.wilaya || ''}</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="py-1">
                                <span className="font-bold">Nature de l&apos;activité exercée : </span>
                                <span className="border-b border-dotted border-black inline-block min-w-[250px] uppercase">{t?.activity || 'COMMERCE DE DÉTAIL'}</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="py-1">
                                <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
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
                                <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
                                    <div className="flex items-center gap-1">
                                        <span className="font-bold">N.I.S :</span>
                                        <NifBoxes value={t?.nis} count={18} />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-bold">R.C :</span>
                                        <span className="border-b border-dotted border-black inline-block min-w-[100px] font-mono text-[10px]">{t?.rc || ''}</span>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td className="py-1">
                                <div className="flex flex-wrap gap-x-6 gap-y-1">
                                    <div>
                                        <span className="font-bold">Tél : </span>
                                        <span className="border-b border-dotted border-black inline-block min-w-[100px]">{t?.phone || ''}</span>
                                    </div>
                                    <div>
                                        <span className="font-bold">Fax / E-mail : </span>
                                        <span className="border-b border-dotted border-black inline-block min-w-[120px]">{t?.email || ''}</span>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ────────── CADRE II : TABLEAU I — RÉPARTITION DU CA ────────── */}
            <div className="border-2 border-black mb-2">
                <div className="bg-gray-200 border-b-2 border-black text-center font-bold py-1 text-[10px]">
                    CADRE II — TABLEAU I : RÉPARTITION {data.mode === "previsionnel" ? "PRÉVISIONNELLE" : "DÉFINITIVE"} DU CHIFFRE D&apos;AFFAIRES
                    <br />
                    <span className="text-[8px]">الإطار الثاني — الجدول الأول : توزيع رقم الأعمال</span>
                </div>

                <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '10px' }}>
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-1.5 text-center" style={{ width: '5%' }}>N°</th>
                            <th className="border border-black p-1.5 text-left" style={{ width: '40%' }}>PÉRIODICITÉ (الفترة)</th>
                            <th className="border border-black p-1.5 text-center" style={{ width: '27%' }}>CHIFFRE D&apos;AFFAIRES H.T. (DA)</th>
                            <th className="border border-black p-1.5 text-center" style={{ width: '28%' }}>MONTANT I.F.U. À VERSER (DA)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.quarters.map((q, i) => (
                            <tr key={q.quarter}>
                                <td className="border border-black p-1.5 text-center font-bold">{String(i + 1).padStart(2, '0')}</td>
                                <td className="border border-black p-1.5 pl-2">
                                    <span className="font-bold">{QUARTER_LABELS[i]?.label || `${q.quarter}ème Trimestre`}</span>
                                </td>
                                <td className="border border-black p-1.5 text-right font-mono">{fmt(q.caHT)}</td>
                                <td className="border border-black p-1.5 text-right font-mono">{fmt(q.ifuAmount)}</td>
                            </tr>
                        ))}
                        <tr className="bg-gray-100">
                            <td className="border-2 border-black p-1.5 text-center font-extrabold" colSpan={2}>
                                TOTAL ANNUEL (المجموع السنوي)
                            </td>
                            <td className="border-2 border-black p-1.5 text-right font-mono font-bold text-[11px]">{fmt(data.totalCA)}</td>
                            <td className="border-2 border-black p-1.5 text-right font-mono font-bold text-[11px]">{fmt(data.totalIFU)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ────────── CADRE III : TABLEAU II — LIQUIDATION DE L'IFU ────────── */}
            <div className="border-2 border-black mb-2">
                <div className="bg-gray-200 border-b-2 border-black text-center font-bold py-1 text-[10px]">
                    CADRE III — TABLEAU II : LIQUIDATION DE L&apos;IMPÔT FORFAITAIRE UNIQUE (I.F.U.)
                    <br />
                    <span className="text-[8px]">الإطار الثالث — الجدول الثاني : تصفية الضريبة الجزافية الوحيدة</span>
                </div>

                <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '10px' }}>
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-1.5 text-center" rowSpan={2} style={{ width: '30%' }}>
                                BASE IMPOSABLE<br />(رقم الأعمال)<br />(DA)
                            </th>
                            <th className="border border-black p-1.5 text-center" colSpan={3}>
                                TAUX APPLICABLES (النسب المطبقة)
                            </th>
                            <th className="border border-black p-1.5 text-center" rowSpan={2} style={{ width: '25%' }}>
                                MONTANT TOTAL<br />I.F.U.<br />(DA)
                            </th>
                        </tr>
                        <tr className="bg-gray-50">
                            <th className="border border-black p-1.5 text-center" style={{ width: '15%' }}>
                                <div className="font-bold">0,5%</div>
                                <div className="text-[8px] font-normal">(Auto-entrepreneur)</div>
                            </th>
                            <th className="border border-black p-1.5 text-center" style={{ width: '15%' }}>
                                <div className="font-bold">5%</div>
                                <div className="text-[8px] font-normal">(Production/Vente)</div>
                            </th>
                            <th className="border border-black p-1.5 text-center" style={{ width: '15%' }}>
                                <div className="font-bold">12%</div>
                                <div className="text-[8px] font-normal">(Services/Autres)</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-black p-3 text-center font-mono font-bold text-[12px]">
                                {fmt(data.totalCA)}
                            </td>
                            <td className="border border-black p-3 text-center">
                                {data.ifuRate === 0.5 ? (
                                    <span className="inline-block w-5 h-5 border-2 border-black bg-black text-white text-[11px] font-bold text-center leading-5">✓</span>
                                ) : (
                                    <span className="inline-block w-5 h-5 border border-gray-400"></span>
                                )}
                            </td>
                            <td className="border border-black p-3 text-center">
                                {data.ifuRate === 5 ? (
                                    <span className="inline-block w-5 h-5 border-2 border-black bg-black text-white text-[11px] font-bold text-center leading-5">✓</span>
                                ) : (
                                    <span className="inline-block w-5 h-5 border border-gray-400"></span>
                                )}
                            </td>
                            <td className="border border-black p-3 text-center">
                                {data.ifuRate === 12 ? (
                                    <span className="inline-block w-5 h-5 border-2 border-black bg-black text-white text-[11px] font-bold text-center leading-5">✓</span>
                                ) : (
                                    <span className="inline-block w-5 h-5 border border-gray-400"></span>
                                )}
                            </td>
                            <td className="border border-black p-3 text-center font-mono font-extrabold text-[13px]">
                                {fmt(data.totalIFU)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ────────── CADRE IV : ÉCHÉANCIER DE PAIEMENT ────────── */}
            <div className="border-2 border-black mb-2">
                <div className="bg-gray-200 border-b-2 border-black text-center font-bold py-1 text-[9px]">
                    CADRE IV : ÉCHÉANCIER DE PAIEMENT — جدول الدفع
                </div>
                <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '9.5px' }}>
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="border border-black p-1 text-center" style={{ width: '10%' }}>N°</th>
                            <th className="border border-black p-1 text-left" style={{ width: '50%' }}>ÉCHÉANCE</th>
                            <th className="border border-black p-1 text-center" style={{ width: '15%' }}>%</th>
                            <th className="border border-black p-1 text-center" style={{ width: '25%' }}>MONTANT (DA)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-black p-1 text-center">01</td>
                            <td className="border border-black p-1 pl-2">Lors du dépôt de la déclaration (30 juin)</td>
                            <td className="border border-black p-1 text-center font-bold">50%</td>
                            <td className="border border-black p-1 text-right font-mono">{fmt(data.totalIFU * 0.5)}</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 text-center">02</td>
                            <td className="border border-black p-1 pl-2">Du 1er au 15 septembre</td>
                            <td className="border border-black p-1 text-center font-bold">25%</td>
                            <td className="border border-black p-1 text-right font-mono">{fmt(data.totalIFU * 0.25)}</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 text-center">03</td>
                            <td className="border border-black p-1 pl-2">Du 1er au 15 décembre</td>
                            <td className="border border-black p-1 text-center font-bold">25%</td>
                            <td className="border border-black p-1 text-right font-mono">{fmt(data.totalIFU * 0.25)}</td>
                        </tr>
                        <tr className="bg-gray-100">
                            <td className="border-2 border-black p-1 text-center font-bold" colSpan={3}>TOTAL À PAYER</td>
                            <td className="border-2 border-black p-1 text-right font-mono font-extrabold text-[11px]">{fmt(data.totalIFU)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ────────── PROJECTION (Interne uniquement) ────────── */}
            {data.mode === "previsionnel" && data.projectedCA && (
                <div className="border-2 border-dashed border-gray-400 p-2 mb-2 bg-gray-50">
                    <p className="font-bold text-center text-[9px] mb-1">📊 NOTE DE PROJECTION INTERNE (Non certifiée DGI — للاستعمال الداخلي فقط)</p>
                    <p className="text-center text-[9px]">
                        Sur la base de <strong>{data.monthsElapsed} mois</strong> écoulé(s), votre CA projeté en fin d&apos;exercice est de : <span className="font-mono font-bold">{fmt(data.projectedCA)} DA</span>
                    </p>
                </div>
            )}

            {/* ────────── ENGAGEMENT & SIGNATURE ────────── */}
            <div className="border-2 border-black p-2 mb-2">
                <p className="font-bold text-[9px] mb-1">
                    Je soussigné(e) certifie exacts les renseignements figurant sur la présente déclaration et m&apos;engage à verser
                    le montant de l&apos;impôt aux échéances fixées par la loi.
                </p>
                <p className="text-[8px] text-gray-500 italic">
                    أشهد بصحة المعلومات الواردة في هذا التصريح وأتعهد بدفع مبلغ الضريبة في الآجال المحددة قانونا
                </p>
            </div>

            <div className="flex justify-between items-start mt-2">
                <div className="text-[9px] border-2 border-black p-2" style={{ width: '45%' }}>
                    <p className="font-bold mb-1 text-center border-b border-black pb-1">CADRE RÉSERVÉ À L&apos;ADMINISTRATION</p>
                    <p className="text-[8px] text-gray-500">Reçu et enregistré le :</p>
                    <p className="mt-4 text-center">Cachet et visa du Receveur</p>
                    <div className="h-[40px]"></div>
                </div>
                <div className="text-[9px] text-center" style={{ width: '45%' }}>
                    <p className="mb-1">A .................... , le ...... / ...... / {data.year}</p>
                    <p className="font-bold mt-1 mb-1">SIGNATURE ET CACHET DU DÉCLARANT</p>
                    <p className="text-[8px]">توقيع وختم المصرح</p>
                    <div className="h-[40px]"></div>
                </div>
            </div>

            <div className="text-[8px] text-gray-400 text-center mt-3 border-t border-gray-200 pt-1">
                Document généré automatiquement par SYNCLOUDPOS — Conforme au modèle officiel Série G N°{data.mode === "previsionnel" ? "12" : "12 Bis"} de la DGI
            </div>
        </div>
    )
}
