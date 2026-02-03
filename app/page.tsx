"use client"

import React, { useState, useRef } from "react"
import { BlockEditor } from "@/components/block-editor"
import { Button } from "@/components/ui/button"
import { sanitizeHtml } from "@/lib/sanitize"
import { Upload, Download, FileText, Code2 } from "lucide-react"

export default function Home() {
  const [guideData, setGuideData] = useState<GuideData>({
    title: "API 사용자 가이드",
    sections: [],
  })
  const [showCode, setShowCode] = useState<false | true | "preview">(false)
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
            <Button variant="ghost" size="sm" onClick={() => setShowCode(showCode === true ? false : true)}>
              <Code2 className="w-4 h-4 mr-1.5" />
              HTML 코드
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCode("preview")}>
              <FileText className="w-4 h-4 mr-1.5" />
              미리보기
            </Button>
            <Button size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1.5" />
              내보내기
            </Button>
          </div>
        </div>
      </header>
      
      {/* 메인 컨텐츠 */}
      {showCode === true ? (
        <HtmlCodeView guideData={guideData} onClose={() => setShowCode(false)} />
      ) : showCode === "preview" ? (
        <HtmlPreview guideData={guideData} onClose={() => setShowCode(false)} />
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
  const apiTitle = doc.querySelector(".api-title")?.textContent || 
                   doc.querySelector("title")?.textContent || 
                   "API 사용자 가이드"
  
  // 섹션 추출
  const sections: Section[] = []
  const sectionElements = doc.querySelectorAll(".right-guide-area section, .right-ac-area section")
  
  // 부모 섹션과 하위 섹션 분리
  const parentSections: Map<string, { element: Element; section: Section }> = new Map()
  const subSectionMap: Map<string, SubSection[]> = new Map()
  
  sectionElements.forEach((sectionEl) => {
    const id = sectionEl.getAttribute("id") || ""
    const h1 = sectionEl.querySelector("h1")
    const h2 = sectionEl.querySelector("h2")
    
    if (h1) {
      // 부모 섹션
      const section: Section = {
        title: h1.innerHTML || "",
        content: parseContentBlocks(sectionEl, "h1"),
        subSections: [],
      }
      parentSections.set(id, { element: sectionEl, section })
    } else if (h2) {
      // 하위 섹션
      const parentId = id.replace(/_\d+$/, "")
      const navLink = doc.querySelector(`a[href="#${id}"]`)
      const deprecated = navLink?.classList.contains("deprecated-ac-list") || false
      
      const subSection: SubSection = {
        title: h2.innerHTML || "",
        content: parseContentBlocks(sectionEl, "h2"),
        deprecated,
      }
      
      if (!subSectionMap.has(parentId)) {
        subSectionMap.set(parentId, [])
      }
      subSectionMap.get(parentId)!.push(subSection)
    }
  })
  
  // 하위 섹션 연결
  parentSections.forEach((value, id) => {
    value.section.subSections = subSectionMap.get(id) || []
    sections.push(value.section)
  })
  
  return { title: apiTitle, sections }
}

function parseContentBlocks(sectionEl: Element, skipTag: string): ContentBlock[] {
  const blocks: ContentBlock[] = []
  const children = sectionEl.children
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    const tagName = child.tagName.toLowerCase()
    
    if (tagName === skipTag.toLowerCase()) continue
    
    if (tagName === "p") {
      if (child.classList.contains("api-wrn")) {
        blocks.push({ type: "warning", text: child.innerHTML })
      } else if (child.classList.contains("api-info")) {
        blocks.push({ type: "info", text: child.innerHTML })
      } else {
        blocks.push({ type: "paragraph", text: child.innerHTML })
      }
    } else if (tagName === "h3") {
      blocks.push({ type: "heading3", text: child.innerHTML || "" })
    } else if (tagName === "h4") {
      blocks.push({ type: "heading4", text: child.innerHTML || "" })
    } else if (tagName === "code") {
      const pre = child.querySelector("pre")
      blocks.push({ 
        type: "code", 
        text: pre?.textContent || child.textContent || "",
        language: child.getAttribute("language") || "bash"
      })
    } else if (tagName === "dl" && child.classList.contains("api-pre-box")) {
      const dt = child.querySelector("dt")
      const code = child.querySelector("code")
      const pre = child.querySelector("pre")
      blocks.push({
        type: "codeBox",
        title: dt?.textContent || "",
        text: pre?.textContent || code?.textContent || "",
        language: code?.getAttribute("language") || "json"
      })
    } else if (tagName === "table") {
      const headers: string[] = []
      const rows: string[][] = []
      
      child.querySelectorAll("thead th").forEach(th => {
        headers.push(th.innerHTML)
      })
      
      child.querySelectorAll("tbody tr").forEach(tr => {
        const row: string[] = []
        tr.querySelectorAll("td").forEach(td => {
          row.push(td.innerHTML)
        })
        rows.push(row)
      })
      
      if (headers.length > 0 || rows.length > 0) {
        blocks.push({
          type: "table",
          tableData: { 
            headers: headers.length > 0 ? headers : ["Column"],
            rows: rows.length > 0 ? rows : [[""]]
          }
        })
      }
    }
  }
  
  return blocks
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

function HtmlPreview({ guideData, onClose }: { guideData: GuideData; onClose: () => void }) {
  const htmlCode = generateHtml(guideData)
  const safeHtml = sanitizeHtml(htmlCode)

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <span className="text-sm font-medium">문서 미리보기</span>
        <Button variant="ghost" size="sm" onClick={onClose}>
          닫기
        </Button>
      </div>
      <div className="flex-1 overflow-auto bg-white">
        <div className="preview-frame" dangerouslySetInnerHTML={{ __html: safeHtml }} />
      </div>
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
        return `        <code language="${block.language || 'bash'}">
          <pre>${block.text}</pre>
        </code>\n`
      case "codeBox":
        return `        <dl class="api-pre-box">
          <dt>${block.title || ''}</dt>
          <dd>
            <code language="${block.language || 'json'}">
              <pre>${block.text}</pre>
            </code>
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
