"use client"

import React, { useState, useRef } from "react"
import { BlockEditor } from "@/components/block-editor"
import { Button } from "@/components/ui/button"
import { Upload, Download, FileText, Code2 } from "lucide-react"

export default function Home() {
  const [guideData, setGuideData] = useState<GuideData>({
    title: "API 사용자 가이드",
    sections: [],
  })
  const [showCode, setShowCode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const htmlContent = event.target?.result as string
      const parsedData = parseHtmlToGuideData(htmlContent)
      setGuideData(parsedData)
    }
    reader.readAsText(file)
    
    // Reset input value to allow re-importing the same file
    e.target.value = ""
  }

  const handleExport = () => {
    const htmlCode = generateHtml(guideData)
    const blob = new Blob([htmlCode], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${guideData.title.replace(/[^a-zA-Z0-9가-힣]/g, "_")}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleNewDocument = () => {
    if (guideData.sections.length > 0) {
      const confirmed = window.confirm("현재 작성 중인 내용이 모두 삭제됩니다. 계속하시겠습니까?")
      if (!confirmed) return
    }
    setGuideData({
      title: "API 사용자 가이드",
      sections: [],
    })
  }

  return (
    <main className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold">API 사용자 가이드 편집기</h1>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button variant="ghost" size="sm" onClick={handleNewDocument}>
              <FileText className="w-4 h-4 mr-1.5" />
              새 문서
            </Button>
            <Button variant="ghost" size="sm" onClick={handleImportClick}>
              <Upload className="w-4 h-4 mr-1.5" />
              가져오기
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCode(!showCode)}>
              <Code2 className="w-4 h-4 mr-1.5" />
              HTML 코드
            </Button>
            <Button size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1.5" />
              내보내기
            </Button>
          </div>
        </div>
      </header>
      
      {/* 메인 컨텐츠 */}
      {showCode ? (
        <HtmlCodeView guideData={guideData} onClose={() => setShowCode(false)} />
      ) : (
        <BlockEditor guideData={guideData} onChange={setGuideData} />
      )}
    </main>
  )
}

// HTML 파싱 함수
function parseHtmlToGuideData(html: string): GuideData {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  
  // 제목 추출
  const apiTitle = doc.querySelector(".api-title")?.textContent?.trim() || 
                   doc.querySelector("title")?.textContent?.trim() || 
                   "API 사용자 가이드"
  
  // 네비게이션에서 부모-자식 관계 파악
  const navParentIds = new Set<string>()   // 부모 섹션 ID
  const navChildMap = new Map<string, string>() // 자식 ID → 부모 ID
  const navDeprecated = new Set<string>()  // deprecated ID
  
  const navLinks = doc.querySelectorAll(".left-ac-list a[href^='#']")
  navLinks.forEach((link) => {
    const href = link.getAttribute("href")?.slice(1) || ""
    if (!href) return
    
    if (link.classList.contains("deprecated-ac-list")) {
      navDeprecated.add(href)
    }
    
    // 부모 li 안에 중첩 ul > li > a 인지 확인
    const parentUl = link.closest("ul")
    if (parentUl && !parentUl.classList.contains("scroll-box")) {
      // 중첩 ul 안에 있음 → 자식 섹션
      const parentLi = parentUl.closest("li")
      if (parentLi) {
        const parentLink = parentLi.querySelector(":scope > a[href^='#']")
        if (parentLink) {
          const parentId = parentLink.getAttribute("href")?.slice(1) || ""
          navChildMap.set(href, parentId)
          navParentIds.add(parentId)
        }
      }
    }
  })
  
  // 섹션 엘리먼트를 순서대로 파싱
  const sectionElements = doc.querySelectorAll(".right-guide-area section, .right-ac-area section")
  
  // 부모 섹션과 하위 섹션을 정렬된 순서로 수집
  const parentSectionMap = new Map<string, Section>()
  const parentOrder: string[] = []
  const childSectionMap = new Map<string, SubSection[]>()
  
  sectionElements.forEach((sectionEl) => {
    const id = sectionEl.getAttribute("id") || ""
    if (!id) return
    
    const isChildInNav = navChildMap.has(id)
    const parentIdFromNav = navChildMap.get(id) || ""
    
    if (isChildInNav) {
      // 네비게이션에서 자식으로 등록된 섹션
      const heading = sectionEl.querySelector("h1, h2")
      const deprecated = navDeprecated.has(id)
      const skipTag = sectionEl.querySelector("h1") ? "h1" : "h2"
      
      const subSection: SubSection = {
        title: heading?.textContent?.trim() || "",
        content: parseContentBlocks(sectionEl, skipTag),
        deprecated,
      }
      
      if (!childSectionMap.has(parentIdFromNav)) {
        childSectionMap.set(parentIdFromNav, [])
      }
      childSectionMap.get(parentIdFromNav)!.push(subSection)
    } else {
      // 부모 섹션 또는 독립 섹션
      const heading = sectionEl.querySelector("h1, h2")
      const skipTag = sectionEl.querySelector("h1") ? "h1" : (sectionEl.querySelector("h2") ? "h2" : "")
      
      const section: Section = {
        title: heading?.textContent?.trim() || "",
        content: skipTag ? parseContentBlocks(sectionEl, skipTag) : [],
        subSections: [],
      }
      parentSectionMap.set(id, section)
      parentOrder.push(id)
    }
  })
  
  // 하위 섹션을 부모에 연결
  const sections: Section[] = []
  parentOrder.forEach((id) => {
    const section = parentSectionMap.get(id)!
    section.subSections = childSectionMap.get(id) || []
    sections.push(section)
  })
  
  return { title: apiTitle, sections }
}

function parseContentBlocks(sectionEl: Element, skipTag: string): ContentBlock[] {
  const blocks: ContentBlock[] = []
  const children = sectionEl.children
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    const tagName = child.tagName.toLowerCase()
    
    // 첫 번째 heading(섹션 제목)은 스킵
    if (skipTag && tagName === skipTag.toLowerCase() && i === firstIndexOfTag(children, skipTag)) continue
    
    if (tagName === "p") {
      if (child.classList.contains("api-wrn")) {
        blocks.push({ type: "warning", text: child.innerHTML })
      } else if (child.classList.contains("api-info")) {
        blocks.push({ type: "info", text: child.innerHTML })
      } else {
        blocks.push({ type: "paragraph", text: child.innerHTML })
      }
    } else if (tagName === "h2" || tagName === "h3") {
      // 섹션 내 소제목 (네비게이션에 없는 h2도 heading3으로 처리)
      blocks.push({ type: "heading3", text: child.textContent?.trim() || "" })
    } else if (tagName === "h4") {
      blocks.push({ type: "heading4", text: child.textContent?.trim() || "" })
    } else if (tagName === "code") {
      // <code><pre>...</pre></code> 형태
      const pre = child.querySelector("pre")
      blocks.push({ 
        type: "code", 
        text: pre?.textContent || child.textContent || "",
        language: child.getAttribute("language") || "bash"
      })
    } else if (tagName === "pre") {
      // <pre><code>...</code></pre> 형태
      const code = child.querySelector("code")
      blocks.push({
        type: "code",
        text: code?.textContent || child.textContent || "",
        language: code?.getAttribute("language") || "bash"
      })
    } else if (tagName === "dl" && child.classList.contains("api-pre-box")) {
      const dt = child.querySelector("dt")
      // <dl><dd><pre><code> 또는 <dl><dd><code><pre> 두 가지 패턴 지원
      const dd = child.querySelector("dd")
      const codeText = dd?.querySelector("code")?.textContent || 
                       dd?.querySelector("pre")?.textContent || 
                       dd?.textContent || ""
      blocks.push({
        type: "codeBox",
        title: dt?.textContent?.trim() || "",
        text: codeText,
        language: "json"
      })
    } else if (tagName === "table") {
      const headers: string[] = []
      const rows: string[][] = []
      
      // thead 안의 th를 찾되, tr 안에 있든 없든 모두 처리
      const thead = child.querySelector("thead")
      if (thead) {
        thead.querySelectorAll("th").forEach(th => {
          headers.push(th.innerHTML.trim())
        })
      }
      
      // tbody가 없어도 tr을 찾음
      const tbody = child.querySelector("tbody")
      const trContainer = tbody || child
      trContainer.querySelectorAll("tr").forEach(tr => {
        if (tr.closest("thead")) return
        const row: string[] = []
        tr.querySelectorAll("td").forEach(td => {
          row.push(td.innerHTML.trim())
        })
        if (row.length > 0) {
          rows.push(row)
        }
      })

      // 빈 테이블 스킵
      if (headers.length === 0 && rows.length === 0) continue

      // 열 수 정규화
      const colCount = Math.max(headers.length, ...rows.map(r => r.length), 1)
      while (headers.length < colCount) headers.push("")
      const normalizedRows = rows.map(row => {
        while (row.length < colCount) row.push("")
        return row
      })
      
      blocks.push({
        type: "table",
        tableData: { 
          headers,
          rows: normalizedRows.length > 0 ? normalizedRows : [headers.map(() => "")]
        }
      })
    }
  }
  
  return blocks
}

// children 중 특정 태그의 첫 번째 인덱스 반환
function firstIndexOfTag(children: HTMLCollection, tag: string): number {
  for (let i = 0; i < children.length; i++) {
    if (children[i].tagName.toLowerCase() === tag.toLowerCase()) return i
  }
  return -1
}

function HtmlCodeView({ guideData, onClose }: { guideData: GuideData; onClose: () => void }) {
  const htmlCode = generateHtml(guideData)
  const [copied, setCopied] = useState(false)
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(htmlCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <span className="text-sm font-medium">생성된 HTML 코드</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            {copied ? "복사됨!" : "복사하기"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
      <pre className="flex-1 p-4 overflow-auto text-sm font-mono bg-muted/20">
        <code>{htmlCode}</code>
      </pre>
    </div>
  )
}

function generateHtml(guideData: GuideData): string {
  const navItems = guideData.sections.map((section, idx) => {
    const sectionId = `ac_${String(idx).padStart(2, "0")}`
    const hasChildren = section.subSections && section.subSections.length > 0
    
    let navHtml = `        <li>`
    if (hasChildren) {
      navHtml += `<a href="#${sectionId}" class="has-child">${section.title}</a>\n`
      navHtml += `          <ul>\n`
      section.subSections?.forEach((sub, subIdx) => {
        const subId = `${sectionId}_${subIdx + 1}`
        const deprecatedClass = sub.deprecated ? ' class="deprecated-ac-list"' : ''
        const title = sub.deprecated ? `<s>${sub.title}</s>` : sub.title
        navHtml += `            <li><a href="#${subId}"${deprecatedClass}>${title}</a></li>\n`
      })
      navHtml += `          </ul>`
    } else {
      navHtml += `<a href="#${sectionId}">${section.title}</a>`
    }
    navHtml += `</li>`
    return navHtml
  }).join("\n")

  const sectionsHtml = guideData.sections.map((section, idx) => {
    const sectionId = `ac_${String(idx).padStart(2, "0")}`
    let html = `      <section id="${sectionId}">\n`
    html += `        <h1>${section.title}</h1>\n`
    html += renderContent(section.content)
    html += `      </section>\n`

    section.subSections?.forEach((sub, subIdx) => {
      const subId = `${sectionId}_${subIdx + 1}`
      html += `      <section id="${subId}">\n`
      html += `        <h2>${sub.title}</h2>\n`
      html += renderContent(sub.content)
      html += `      </section>\n`
    })

    return html
  }).join("")

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <meta http-equiv='X-UA-Compatible' content='IE=edge'>
  <title>${guideData.title}</title>
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <link rel='stylesheet' type='text/css' media='screen' href='style.css'>
</head>
<body>
  <div class="api-guide">
    <div class="left-ac-list">
      <ul class="scroll-box">
${navItems}
      </ul>
    </div>
    <div class="right-guide-area">
      <h1 class="api-title">${guideData.title}</h1>
${sectionsHtml}
    </div>
  </div>
</body>
</html>`
}

function renderContent(content: ContentBlock[]): string {
  return content.map(block => {
    switch (block.type) {
      case "paragraph":
        return `        <p>${block.text}</p>\n`
      case "warning":
        return `        <p class="api-wrn">${block.text}</p>\n`
      case "info":
        return `        <p class="api-info">${block.text}</p>\n`
      case "heading3":
        return `        <h3>${block.text}</h3>\n`
      case "heading4":
        return `        <h4>${block.text}</h4>\n`
      case "code":
        return `        <pre><code>${block.text}</code></pre>\n`
      case "codeBox":
        return `        <dl class="api-pre-box">
          <dt>${block.title || ''}</dt>
          <dd>
            <pre><code>${block.text}</code></pre>
          </dd>
        </dl>\n`
      case "table":
        return renderTable(block)
      default:
        return ""
    }
  }).join("")
}

function renderTable(block: ContentBlock): string {
  if (!block.tableData) return ""
  const { headers, rows } = block.tableData
  
  let html = `        <table class="prv-table">\n`
  html += `          <thead>\n            <tr>\n`
  headers.forEach(h => {
    html += `              <th>${h}</th>\n`
  })
  html += `            </tr>\n          </thead>\n`
  html += `          <tbody>\n`
  rows.forEach(row => {
    html += `            <tr>\n`
    row.forEach(cell => {
      html += `              <td>${cell}</td>\n`
    })
    html += `            </tr>\n`
  })
  html += `          </tbody>\n        </table>\n`
  return html
}

// Types
export interface GuideData {
  title: string
  sections: Section[]
}

export interface Section {
  title: string
  content: ContentBlock[]
  subSections?: SubSection[]
}

export interface SubSection {
  title: string
  content: ContentBlock[]
  deprecated?: boolean
}

export interface ContentBlock {
  type: "paragraph" | "warning" | "info" | "heading3" | "heading4" | "code" | "codeBox" | "table"
  text?: string
  language?: string
  title?: string
  tableData?: {
    headers: string[]
    rows: string[][]
  }
}
