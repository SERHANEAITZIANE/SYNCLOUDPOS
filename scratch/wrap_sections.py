import re

filepath = r"c:\Users\tre\Documents\SYNCLOUDPOS\src\app\[locale]\landing-client.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Wrap HERO and TRUST BAR
hero_start = re.search(r'\{\/\* ═══ HERO ═══ \*\/\}[\r\n]+[ \t]*<section className="lp-hero">', content)
trust_end = re.search(r'\{\/\* ═══ TRUST BAR ═══ \*\/\}[\s\S]*?<\/div>[\r\n]+[ \t]*<\/div>[\r\n]+[ \t]*<\/div>', content)

if hero_start and trust_end:
    print("Found Hero and Trust Bar boundary")
    
    # We want to insert the compact header and home check before the hero start
    compact_header_and_hero_start = """{pageType !== 'home' && (
        <section className="lp-hero" style={{ padding: '140px 0 60px 0', minHeight: 'auto', background: 'radial-gradient(circle at top, rgba(124, 58, 237, 0.08), transparent 60%)' }}>
          <div className="lp-container">
            <div className="lp-hero-inner" style={{ textAlign: 'center' }}>
              <h1 className="lp-hero-title" style={{ fontSize: '3rem', marginBottom: '1rem', background: 'linear-gradient(135deg, #fff 30%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {pageType === 'features' && t('nav_features')}
                {pageType === 'apps' && t('sec_apps_tag')}
                {pageType === 'usecases' && t('nav_usecases')}
                {pageType === 'pricing' && t('sec_price_title')}
                {pageType === 'contact' && t('nav_contact')}
              </h1>
              <p className="lp-hero-desc" style={{ maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem', color: '#94a3b8' }}>
                {pageType === 'features' && t('sec_feat_desc')}
                {pageType === 'apps' && t('sec_apps_desc')}
                {pageType === 'usecases' && t('sec_uc_desc')}
                {pageType === 'pricing' && t('sec_price_desc')}
                {pageType === 'contact' && t('sec_cont_desc')}
              </p>
            </div>
          </div>
        </section>
      )}

      {pageType === 'home' && (
        <>
          {/* ═══ HERO ═══ */}
          <section className="lp-hero">"""
    
    content = content.replace(hero_start.group(0), compact_header_and_hero_start)
    
    # Re-evaluate trust end because content changed
    trust_end = re.search(r'\{\/\* ═══ TRUST BAR ═══ \*\/\}[\s\S]*?<\/div>[\r\n]+[ \t]*<\/div>[\r\n]+[ \t]*<\/div>', content)
    if trust_end:
        content = content.replace(trust_end.group(0), trust_end.group(0) + "\n        </>\n      )}")

# 2. Wrap FEATURES section
features_sec_start = '{/* ═══ FEATURES ═══ */}\n      <section id="features" className="lp-section">'
features_sec_start_crlf = '{/* ═══ FEATURES ═══ */}\r\n      <section id="features" className="lp-section">'

if features_sec_start in content:
    content = content.replace(features_sec_start, '{/* ═══ FEATURES ═══ */}\n      {(pageType === \'home\' || pageType === \'features\') && (\n        <section id="features" className="lp-section">')
elif features_sec_start_crlf in content:
    content = content.replace(features_sec_start_crlf, '{/* ═══ FEATURES ═══ */}\r\n      {(pageType === \'home\' || pageType === \'features\') && (\r\n        <section id="features" className="lp-section">')

# Wrap explorer / summary inside features
explorer_div = '<div className="lp-features-explorer lp-reveal">'
if explorer_div in content:
    content = content.replace(explorer_div, '{pageType === \'features\' ? (\n            <div className="lp-features-explorer lp-reveal">')

# Wrap closing tags of features
features_end_find = """              </div>
            )}
          </div>
        </div>
      </section>"""
features_end_find_crlf = """              </div>\r
            )}\r
          </div>\r
        </div>\r
      </section>"""

features_replacement = """            </div>
          ) : (
            <div className="lp-features-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '40px' }}>
              {FEATURES.slice(0, 4).map((cat) => (
                <div key={cat.title.fr} className="lp-feature-sum-card" style={{ background: '#1e293b', padding: '32px', borderRadius: '24px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{cat.icon}</div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>
                    {lang === 'ar' ? cat.title.ar : lang === 'en' ? cat.title.en : cat.title.fr}
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '20px', lineHeight: 1.6 }}>
                    {lang === 'ar' ? cat.desc.ar : lang === 'en' ? cat.desc.en : cat.desc.fr}
                  </p>
                  <ul style={{ color: '#f8fafc', paddingLeft: '16px', listStyleType: 'disc', fontSize: '0.9rem' }}>
                    {(cat.items[lang] || cat.items.fr).slice(0, 4).map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '8px' }}>
                        <strong>{item.title}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: '32px' }}>
                <button className="lp-btn-primary" onClick={() => window.location.href = `/${lang}/features`} style={{ padding: '16px 36px', fontSize: '1.1rem' }}>
                  {lang === 'ar' ? 'اكتشف كل المميزات الـ 120+ ←' : lang === 'en' ? 'Explore all 120+ Features ←' : 'Découvrir toutes les 120+ fonctionnalités ←'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>\n      )}"""

if features_end_find in content:
    content = content.replace(features_end_find, features_replacement)
elif features_end_find_crlf in content:
    content = content.replace(features_end_find_crlf, features_replacement.replace('\n', '\r\n'))

# 3. Wrap USE CASES
uc_start = '{/* ═══ USE CASES ═══ */}\n      <section id="usecases" className="lp-section lp-section-alt">'
uc_start_crlf = '{/* ═══ USE CASES ═══ */}\r\n      <section id="usecases" className="lp-section lp-section-alt">'
if uc_start in content:
    content = content.replace(uc_start, '{/* ═══ USE CASES ═══ */}\n      {(pageType === \'home\' || pageType === \'usecases\') && (\n        <section id="usecases" className="lp-section lp-section-alt">')
elif uc_start_crlf in content:
    content = content.replace(uc_start_crlf, '{/* ═══ USE CASES ═══ */}\r\n      {(pageType === \'home\' || pageType === \'usecases\') && (\r\n        <section id="usecases" className="lp-section lp-section-alt">')

# Wrap end of USE CASES. In code, the next header is Mobile Apps.
# We want to replace the closing section of usecases just before MOBILE APPS
uc_end_find = '</section>\n\n      {/* ═══ MOBILE APPS ═══ */}'
uc_end_find_crlf = '</section>\r\n\r\n      {/* ═══ MOBILE APPS ═══ */}'
if uc_end_find in content:
    content = content.replace(uc_end_find, '</section>\n      )}\n\n      {/* ═══ MOBILE APPS ═══ */}')
elif uc_end_find_crlf in content:
    content = content.replace(uc_end_find_crlf, '</section>\r\n      )}\r\n\r\n      {/* ═══ MOBILE APPS ═══ */}')

# 4. Wrap MOBILE APPS
apps_start = '{/* ═══ MOBILE APPS ═══ */}\n      <section id="apps" className="lp-section">'
apps_start_crlf = '{/* ═══ MOBILE APPS ═══ */}\r\n      <section id="apps" className="lp-section">'
if apps_start in content:
    content = content.replace(apps_start, '{/* ═══ MOBILE APPS ═══ */}\n      {(pageType === \'home\' || pageType === \'apps\') && (\n        <section id="apps" className="lp-section">')
elif apps_start_crlf in content:
    content = content.replace(apps_start_crlf, '{/* ═══ MOBILE APPS ═══ */}\r\n      {(pageType === \'home\' || pageType === \'apps\') && (\r\n        <section id="apps" className="lp-section">')

apps_end_find = '</section>\n\n      {/* ═══ HOW IT WORKS ═══ */}'
apps_end_find_crlf = '</section>\r\n\r\n      {/* ═══ HOW IT WORKS ═══ */}'
if apps_end_find in content:
    content = content.replace(apps_end_find, '</section>\n      )}\n\n      {/* ═══ HOW IT WORKS ═══ */}')
elif apps_end_find_crlf in content:
    content = content.replace(apps_end_find_crlf, '</section>\r\n      )}\r\n\r\n      {/* ═══ HOW IT WORKS ═══ */}')

# 5. Wrap HOW IT WORKS
how_start = '{/* ═══ HOW IT WORKS ═══ */}\n      <section className="lp-section lp-section-alt">'
how_start_crlf = '{/* ═══ HOW IT WORKS ═══ */}\r\n      <section className="lp-section lp-section-alt">'
if how_start in content:
    content = content.replace(how_start, '{/* ═══ HOW IT WORKS ═══ */}\n      {pageType === \'home\' && (\n        <section className="lp-section lp-section-alt">')
elif how_start_crlf in content:
    content = content.replace(how_start_crlf, '{/* ═══ HOW IT WORKS ═══ */}\r\n      {pageType === \'home\' && (\r\n        <section className="lp-section lp-section-alt">')

how_end_find = '</section>\n\n      {/* ═══ TESTIMONIAL ═══ */}'
how_end_find_crlf = '</section>\r\n\r\n      {/* ═══ TESTIMONIAL ═══ */}'
if how_end_find in content:
    content = content.replace(how_end_find, '</section>\n      )}\n\n      {/* ═══ TESTIMONIAL ═══ */}')
elif how_end_find_crlf in content:
    content = content.replace(how_end_find_crlf, '</section>\r\n      )}\r\n\r\n      {/* ═══ TESTIMONIAL ═══ */}')

# 6. Wrap TESTIMONIAL
testi_start = '{/* ═══ TESTIMONIAL ═══ */}\n      <section className="lp-section lp-section-alt">'
testi_start_crlf = '{/* ═══ TESTIMONIAL ═══ */}\r\n      <section className="lp-section lp-section-alt">'
if testi_start in content:
    content = content.replace(testi_start, '{/* ═══ TESTIMONIAL ═══ */}\n      {(pageType === \'home\' || pageType === \'usecases\') && (\n        <section className="lp-section lp-section-alt">')
elif testi_start_crlf in content:
    content = content.replace(testi_start_crlf, '{/* ═══ TESTIMONIAL ═══ */}\r\n      {(pageType === \'home\' || pageType === \'usecases\') && (\r\n        <section className="lp-section lp-section-alt">')

testi_end_find = '</section>\n\n      {/* ═══ PRICING ═══ */}'
testi_end_find_crlf = '</section>\r\n\r\n      {/* ═══ PRICING ═══ */}'
if testi_end_find in content:
    content = content.replace(testi_end_find, '</section>\n      )}\n\n      {/* ═══ PRICING ═══ */}')
elif testi_end_find_crlf in content:
    content = content.replace(testi_end_find_crlf, '</section>\r\n      )}\r\n\r\n      {/* ═══ PRICING ═══ */}')

# 7. Wrap PRICING
pricing_start = '{/* ═══ PRICING ═══ */}\n      <section id="pricing" className="lp-section">'
pricing_start_crlf = '{/* ═══ PRICING ═══ */}\r\n      <section id="pricing" className="lp-section">'
if pricing_start in content:
    content = content.replace(pricing_start, '{/* ═══ PRICING ═══ */}\n      {(pageType === \'home\' || pageType === \'pricing\') && (\n        <section id="pricing" className="lp-section">')
elif pricing_start_crlf in content:
    content = content.replace(pricing_start_crlf, '{/* ═══ PRICING ═══ */}\r\n      {(pageType === \'home\' || pageType === \'pricing\') && (\r\n        <section id="pricing" className="lp-section">')

pricing_end_find = '</section>\n\n      {/* ═══ TRIAL CTA ═══ */}'
pricing_end_find_crlf = '</section>\r\n\r\n      {/* ═══ TRIAL CTA ═══ */}'
if pricing_end_find in content:
    content = content.replace(pricing_end_find, '</section>\n      )}\n\n      {/* ═══ TRIAL CTA ═══ */}')
elif pricing_end_find_crlf in content:
    content = content.replace(pricing_end_find_crlf, '</section>\r\n      )}\r\n\r\n      {/* ═══ TRIAL CTA ═══ */}')

# 8. Wrap TRIAL CTA
trial_start = '{/* ═══ TRIAL CTA ═══ */}\n      <section className="lp-trial">'
trial_start_crlf = '{/* ═══ TRIAL CTA ═══ */}\r\n      <section className="lp-trial">'
if trial_start in content:
    content = content.replace(trial_start, '{/* ═══ TRIAL CTA ═══ */}\n      {(pageType === \'home\' || pageType === \'pricing\') && (\n        <section className="lp-trial">')
elif trial_start_crlf in content:
    content = content.replace(trial_start_crlf, '{/* ═══ TRIAL CTA ═══ */}\r\n      {(pageType === \'home\' || pageType === \'pricing\') && (\r\n        <section className="lp-trial">')

trial_end_find = '</section>\n\n      {/* ═══ CONTACT ═══ */}'
trial_end_find_crlf = '</section>\r\n\r\n      {/* ═══ CONTACT ═══ */}'
if trial_end_find in content:
    content = content.replace(trial_end_find, '</section>\n      )}\n\n      {/* ═══ CONTACT ═══ */}')
elif trial_end_find_crlf in content:
    content = content.replace(trial_end_find_crlf, '</section>\r\n      )}\r\n\r\n      {/* ═══ CONTACT ═══ */}')

# 9. Wrap CONTACT
contact_start = '{/* ═══ CONTACT ═══ */}\n      <section id="contact" className="lp-section lp-section-alt">'
contact_start_crlf = '{/* ═══ CONTACT ═══ */}\r\n      <section id="contact" className="lp-section lp-section-alt">'
if contact_start in content:
    content = content.replace(contact_start, '{/* ═══ CONTACT ═══ */}\n      {(pageType === \'home\' || pageType === \'contact\') && (\n        <section id="contact" className="lp-section lp-section-alt">')
elif contact_start_crlf in content:
    content = content.replace(contact_start_crlf, '{/* ═══ CONTACT ═══ */}\r\n      {(pageType === \'home\' || pageType === \'contact\') && (\r\n        <section id="contact" className="lp-section lp-section-alt">')

# Wrap end of contact
contact_end_find = '</section>\n\n      {/* ═══ FOOTER ═══ */}'
contact_end_find_crlf = '</section>\r\n\r\n      {/* ═══ FOOTER ═══ */}'
if contact_end_find in content:
    content = content.replace(contact_end_find, '</section>\n      )}\n\n      {/* ═══ FOOTER ═══ */}')
elif contact_end_find_crlf in content:
    content = content.replace(contact_end_find_crlf, '</section>\r\n      )}\r\n\r\n      {/* ═══ FOOTER ═══ */}')


# Write back
with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully wrapped all sections!")
