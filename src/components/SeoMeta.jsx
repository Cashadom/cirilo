import { useEffect } from 'react'

export default function SeoMeta({ title, description, canonical, jsonLd }) {
  useEffect(() => {
    document.title = title
    const setMeta = (name, content, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`
      let el = document.head.querySelector(selector)
      if (!el) { el = document.createElement('meta'); el.setAttribute(property ? 'property' : 'name', name); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }
    setMeta('description', description)
    setMeta('og:title', title, true)
    setMeta('og:description', description, true)
    setMeta('og:type', 'website', true)
    setMeta('twitter:card', 'summary_large_image')

    let link = document.head.querySelector('link[rel="canonical"]')
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
    link.href = canonical || window.location.href

    const old = document.getElementById('cirilo-jsonld')
    if (old) old.remove()
    if (jsonLd) {
      const script = document.createElement('script')
      script.id = 'cirilo-jsonld'
      script.type = 'application/ld+json'
      script.text = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }
  }, [title, description, canonical, jsonLd])
  return null
}
