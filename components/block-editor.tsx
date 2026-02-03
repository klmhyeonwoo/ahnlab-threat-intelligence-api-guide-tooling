"use client"

import React, { useState, useRef, useEffect, type KeyboardEvent, type DragEvent } from "react"
import DOMPurify from "isomorphic-dompurify"
import type { GuideData, Section, SubSection, ContentBlock } from "@/app/page"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Trash2,
  GripVertical,
  Type,
  AlertTriangle,
  Info,
  Code,
  Table,
  Heading3,
  Heading4,
  FileCode,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  FolderPlus,
} from "lucide-react"

const sanitizeHtml = (value: string) =>
  DOMPurify.sanitize(value, { ALLOWED_TAGS: ["strong", "em", "b", "i", "u", "br", "code"] })

interface BlockEditorProps {
  guideData: GuideData
  onChange: (data: GuideData) => void
}

export function BlockEditor({ guideData, onChange }: BlockEditorProps) {
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null)
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<number | null>(null)

  const updateTitle = (title: string) => {
    onChange({ ...guideData, title })
  }

  const addSection = () => {
    const newSection: Section = {
      title: "새 섹션",
      content: [],
      subSections: [],
    }
    onChange({ ...guideData, sections: [...guideData.sections, newSection] })
  }

  const updateSection = (index: number, section: Section) => {
    const newSections = [...guideData.sections]
    newSections[index] = section
    onChange({ ...guideData, sections: newSections })
  }

  const removeSection = (index: number) => {
    const newSections = guideData.sections.filter((_, i) => i !== index)
    onChange({ ...guideData, sections: newSections })
  }

  const moveSection = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= guideData.sections.length) return
    const newSections = [...guideData.sections]
    const [moved] = newSections.splice(fromIndex, 1)
    newSections.splice(toIndex, 0, moved)
    onChange({ ...guideData, sections: newSections })
  }

  const handleDragStart = (index: number) => {
    setDraggedSectionIndex(index)
  }

  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault()
    if (draggedSectionIndex !== null && draggedSectionIndex !== index) {
      setDragOverSectionIndex(index)
    }
  }

  const handleDragEnd = () => {
    if (draggedSectionIndex !== null && dragOverSectionIndex !== null) {
      moveSection(draggedSectionIndex, dragOverSectionIndex)
    }
    setDraggedSectionIndex(null)
    setDragOverSectionIndex(null)
  }

  return (
    <div className="block-editor">
      {/* 좌측 네비게이션 */}
      <nav className="block-editor-nav">
        <div className="nav-header">목차</div>
        <ul className="nav-list">
          {guideData.sections.map((section, idx) => {
            const sectionId = `section-${idx}`
            return (
              <li key={sectionId}>
                <a
                  href={`#${sectionId}`}
                  className="nav-item"
                  onClick={(e) => {
                    e.preventDefault()
                    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }}
                >
                  {section.title || "제목 없음"}
                </a>
                {section.subSections && section.subSections.length > 0 && (
                  <ul className="nav-sublist">
                    {section.subSections.map((sub, subIdx) => (
                      <li key={`${sectionId}-sub-${subIdx}`}>
                        <a
                          href={`#${sectionId}-sub-${subIdx}`}
                          className={`nav-subitem ${sub.deprecated ? "deprecated" : ""}`}
                          onClick={(e) => {
                            e.preventDefault()
                            document
                              .getElementById(`${sectionId}-sub-${subIdx}`)
                              ?.scrollIntoView({ behavior: "smooth", block: "start" })
                          }}
                        >
                          {sub.title || "제목 없음"}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
        <button type="button" className="nav-add-section" onClick={addSection}>
          <Plus className="w-4 h-4" />
          섹션 추가
        </button>
      </nav>

      {/* 메인 에디터 영역 */}
      <main className="block-editor-main">
        {/* 문서 제목 */}
        <EditableTitle value={guideData.title} onChange={updateTitle} className="doc-title" placeholder="문서 제목을 입력하세요..." />

        {/* 섹션 목록 */}
        {guideData.sections.map((section, index) => (
          <SectionBlock
            key={index}
            section={section}
            sectionIndex={index}
            onChange={(s) => updateSection(index, s)}
            onRemove={() => removeSection(index)}
            onMoveUp={() => moveSection(index, index - 1)}
            onMoveDown={() => moveSection(index, index + 1)}
            canMoveUp={index > 0}
            canMoveDown={index < guideData.sections.length - 1}
            isDragging={draggedSectionIndex === index}
            isDragOver={dragOverSectionIndex === index}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
          />
        ))}

        {guideData.sections.length === 0 && (
          <div className="empty-placeholder" onClick={addSection}>
            <FolderPlus className="w-8 h-8" />
            <span className="text-lg font-medium">첫 번째 섹션을 추가하세요</span>
            <span className="text-sm opacity-70">클릭하거나 좌측 사이드바에서 추가할 수 있습니다</span>
          </div>
        )}
      </main>
    </div>
  )
}

// 인라인 수정 가능한 제목 컴포넌트
interface EditableTitleProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
}

function EditableTitle({ value, onChange, className = "", placeholder = "제목 입력..." }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleBlur = () => {
    setIsEditing(false)
    if (localValue !== value) {
      onChange(localValue)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur()
    }
    if (e.key === "Escape") {
      setLocalValue(value)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`editable-title-input ${className}`}
        placeholder={placeholder}
      />
    )
  }

  return (
    <div className={`editable-title ${className}`} onClick={() => setIsEditing(true)}>
      {value ? (
        <span
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(value),
          }}
        />
      ) : (
        <span className="placeholder">{placeholder}</span>
      )}
    </div>
  )
}

// 섹션 블록 컴포넌트
interface SectionBlockProps {
  section: Section
  sectionIndex: number
  onChange: (section: Section) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  isDragging: boolean
  isDragOver: boolean
  onDragStart: () => void
  onDragOver: (e: DragEvent) => void
  onDragEnd: () => void
}

function SectionBlock({
  section,
  sectionIndex,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
}: SectionBlockProps) {
  const [showActions, setShowActions] = useState(false)

  const addContent = (type: ContentBlock["type"], insertIndex?: number) => {
    const newBlock: ContentBlock = { type, text: "" }
    if (type === "table") {
      newBlock.tableData = { headers: ["항목", "타입", "설명"], rows: [["", "", ""]] }
    }
    const newContent = [...section.content]
    if (insertIndex !== undefined) {
      newContent.splice(insertIndex + 1, 0, newBlock)
    } else {
      newContent.push(newBlock)
    }
    onChange({ ...section, content: newContent })
  }

  const updateContent = (index: number, block: ContentBlock) => {
    const newContent = [...section.content]
    newContent[index] = block
    onChange({ ...section, content: newContent })
  }

  const removeContent = (index: number) => {
    const newContent = section.content.filter((_, i) => i !== index)
    onChange({ ...section, content: newContent })
  }

  const moveContent = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= section.content.length) return
    const newContent = [...section.content]
    const [moved] = newContent.splice(fromIndex, 1)
    newContent.splice(toIndex, 0, moved)
    onChange({ ...section, content: newContent })
  }

  const addSubSection = () => {
    const newSub: SubSection = { title: "새 하위 섹션", content: [], deprecated: false }
    onChange({ ...section, subSections: [...(section.subSections || []), newSub] })
  }

  const updateSubSection = (index: number, sub: SubSection) => {
    const newSubs = [...(section.subSections || [])]
    newSubs[index] = sub
    onChange({ ...section, subSections: newSubs })
  }

  const removeSubSection = (index: number) => {
    const newSubs = (section.subSections || []).filter((_, i) => i !== index)
    onChange({ ...section, subSections: newSubs })
  }

  return (
    <div
      id={`section-${sectionIndex}`}
      className={`section-block ${isDragging ? "is-dragging" : ""} ${isDragOver ? "is-drag-over" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      {/* 섹션 헤더 */}
      <div className="section-header">
        <div className={`section-actions ${showActions ? "visible" : ""}`}>
          <button 
            type="button" 
            className="drag-handle" 
            title="드래그하여 이동"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <button type="button" className="action-btn" onClick={onMoveUp} disabled={!canMoveUp} title="위로 이동">
            <ChevronUp className="w-4 h-4" />
          </button>
          <button type="button" className="action-btn" onClick={onMoveDown} disabled={!canMoveDown} title="아래로 이동">
            <ChevronDown className="w-4 h-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="action-btn">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={addSubSection}>
                <FolderPlus className="w-4 h-4 mr-2" />
                하위 섹션 추가
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onRemove} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                섹션 삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <EditableTitle
          value={section.title}
          onChange={(title) => onChange({ ...section, title })}
          className="section-title"
          placeholder="섹션 제목을 입력하세요..."
        />
      </div>

      {/* 콘텐츠 블록 */}
      <div className="section-content">
        {section.content.map((block, index) => (
          <ContentBlockItem
            key={index}
            block={block}
            onChange={(b) => updateContent(index, b)}
            onRemove={() => removeContent(index)}
            onAddBelow={(type) => addContent(type, index)}
            onMoveUp={() => moveContent(index, index - 1)}
            onMoveDown={() => moveContent(index, index + 1)}
            canMoveUp={index > 0}
            canMoveDown={index < section.content.length - 1}
          />
        ))}

        {/* 블록 추가 버튼 */}
        <AddBlockButton onAdd={(type) => addContent(type)} />
      </div>

      {/* 하위 섹션 */}
      {section.subSections?.map((sub, subIndex) => (
        <SubSectionBlock
          key={subIndex}
          subSection={sub}
          sectionIndex={sectionIndex}
          subIndex={subIndex}
          onChange={(s) => updateSubSection(subIndex, s)}
          onRemove={() => removeSubSection(subIndex)}
        />
      ))}
    </div>
  )
}

// 하위 섹션 블록
interface SubSectionBlockProps {
  subSection: SubSection
  sectionIndex: number
  subIndex: number
  onChange: (sub: SubSection) => void
  onRemove: () => void
}

function SubSectionBlock({ subSection, sectionIndex, subIndex, onChange, onRemove }: SubSectionBlockProps) {
  const [showActions, setShowActions] = useState(false)

  const addContent = (type: ContentBlock["type"], insertIndex?: number) => {
    const newBlock: ContentBlock = { type, text: "" }
    if (type === "table") {
      newBlock.tableData = { headers: ["항목", "타입", "설명"], rows: [["", "", ""]] }
    }
    const newContent = [...subSection.content]
    if (insertIndex !== undefined) {
      newContent.splice(insertIndex + 1, 0, newBlock)
    } else {
      newContent.push(newBlock)
    }
    onChange({ ...subSection, content: newContent })
  }

  const updateContent = (index: number, block: ContentBlock) => {
    const newContent = [...subSection.content]
    newContent[index] = block
    onChange({ ...subSection, content: newContent })
  }

  const removeContent = (index: number) => {
    const newContent = subSection.content.filter((_, i) => i !== index)
    onChange({ ...subSection, content: newContent })
  }

  const moveContent = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= subSection.content.length) return
    const newContent = [...subSection.content]
    const [moved] = newContent.splice(fromIndex, 1)
    newContent.splice(toIndex, 0, moved)
    onChange({ ...subSection, content: newContent })
  }

  return (
    <div
      id={`section-${sectionIndex}-sub-${subIndex}`}
      className={`subsection-block ${subSection.deprecated ? "deprecated" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="subsection-header">
        <div className={`section-actions ${showActions ? "visible" : ""}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="action-btn">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => onChange({ ...subSection, deprecated: !subSection.deprecated })}
              >
                {subSection.deprecated ? "Deprecated 해제" : "Deprecated 표시"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onRemove} className="text-destructive">
                하위 섹션 삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <EditableTitle
          value={subSection.title}
          onChange={(title) => onChange({ ...subSection, title })}
          className="subsection-title"
          placeholder="하위 섹션 제목 입력..."
        />
        {subSection.deprecated && <span className="deprecated-badge">Deprecated</span>}
      </div>

      <div className="subsection-content">
        {subSection.content.map((block, index) => (
          <ContentBlockItem
            key={index}
            block={block}
            onChange={(b) => updateContent(index, b)}
            onRemove={() => removeContent(index)}
            onAddBelow={(type) => addContent(type, index)}
            onMoveUp={() => moveContent(index, index - 1)}
            onMoveDown={() => moveContent(index, index + 1)}
            canMoveUp={index > 0}
            canMoveDown={index < subSection.content.length - 1}
          />
        ))}

        <AddBlockButton onAdd={(type) => addContent(type)} />
      </div>
    </div>
  )
}

// 콘텐츠 블록 아이템
interface ContentBlockItemProps {
  block: ContentBlock
  onChange: (block: ContentBlock) => void
  onRemove: () => void
  onAddBelow: (type: ContentBlock["type"]) => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}

function ContentBlockItem({
  block,
  onChange,
  onRemove,
  onAddBelow,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: ContentBlockItemProps) {
  const [showActions, setShowActions] = useState(false)
  const [isCodeBoxOpen, setIsCodeBoxOpen] = useState(true)

  const blockIcons: Record<ContentBlock["type"], React.ReactNode> = {
    paragraph: <Type className="w-3.5 h-3.5" />,
    warning: <AlertTriangle className="w-3.5 h-3.5" />,
    info: <Info className="w-3.5 h-3.5" />,
    heading3: <Heading3 className="w-3.5 h-3.5" />,
    heading4: <Heading4 className="w-3.5 h-3.5" />,
    code: <Code className="w-3.5 h-3.5" />,
    codeBox: <FileCode className="w-3.5 h-3.5" />,
    table: <Table className="w-3.5 h-3.5" />,
  }

  return (
    <div
      className={`content-block content-block-${block.type}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`block-actions ${showActions ? "visible" : ""}`}>
        <button type="button" className="drag-handle" title="드래그">
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <AddBlockMenu onSelect={onAddBelow}>
          <button type="button" className="action-btn" title="블록 추가">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </AddBlockMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="action-btn block-type-indicator" title={block.type}>
              {blockIcons[block.type]}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={onMoveUp} disabled={!canMoveUp}>
              위로 이동
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMoveDown} disabled={!canMoveDown}>
              아래로 이동
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRemove} className="text-destructive">
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="block-content">
        {block.type === "paragraph" && (
          <EditableText
            value={block.text || ""}
            onChange={(text) => onChange({ ...block, text })}
            placeholder="텍스트를 입력하세요..."
            className="paragraph-text"
            previewClassName="editable-text-preview"
          />
        )}

        {block.type === "warning" && (
          <div className="warning-box">
            <EditableText
              value={block.text || ""}
              onChange={(text) => onChange({ ...block, text })}
              placeholder="경고 메시지를 입력하세요..."
              previewClassName="editable-text-preview"
            />
          </div>
        )}

        {block.type === "info" && (
          <div className="info-box">
            <EditableText
              value={block.text || ""}
              onChange={(text) => onChange({ ...block, text })}
              placeholder="정보를 입력하세요..."
              previewClassName="editable-text-preview"
            />
          </div>
        )}

        {block.type === "heading3" && (
          <EditableText
            value={block.text || ""}
            onChange={(text) => onChange({ ...block, text })}
            placeholder="소제목 (H3)..."
            className="heading3-text"
            previewClassName="heading3-text"
          />
        )}

        {block.type === "heading4" && (
          <EditableText
            value={block.text || ""}
            onChange={(text) => onChange({ ...block, text })}
            placeholder="소제목 (H4)..."
            className="heading4-text"
            previewClassName="heading4-text"
          />
        )}

        {block.type === "code" && (
          <div className="code-block-wrapper">
            <select
              value={block.language || "bash"}
              onChange={(e) => onChange({ ...block, language: e.target.value })}
              className="language-select"
            >
              <option value="bash">Bash</option>
              <option value="json">JSON</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
            </select>
            <EditableCode
              value={block.text || ""}
              onChange={(text) => onChange({ ...block, text })}
              placeholder="코드를 입력하세요..."
            />
          </div>
        )}

        {block.type === "codeBox" && (
          <div className="codebox-wrapper">
            <div className="codebox-header" onClick={() => setIsCodeBoxOpen(!isCodeBoxOpen)}>
              <ChevronDown className={`w-4 h-4 transition-transform ${isCodeBoxOpen ? "" : "-rotate-90"}`} />
              <input
                type="text"
                value={block.title || ""}
                onChange={(e) => onChange({ ...block, title: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                placeholder="코드 박스 제목..."
                className="codebox-title-input"
              />
              <select
                value={block.language || "json"}
                onChange={(e) => onChange({ ...block, language: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="language-select small"
              >
                <option value="bash">Bash</option>
                <option value="json">JSON</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
              </select>
            </div>
            {isCodeBoxOpen && (
              <div className="codebox-content">
                <EditableCode
                  value={block.text || ""}
                  onChange={(text) => onChange({ ...block, text })}
                  placeholder="코드를 입력하세요..."
                />
              </div>
            )}
          </div>
        )}

        {block.type === "table" && block.tableData && (
          <EditableTable tableData={block.tableData} onChange={(tableData) => onChange({ ...block, tableData })} />
        )}
      </div>
    </div>
  )
}

// 인라인 텍스트 편집기
interface EditableTextProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  previewClassName?: string
}

function EditableText({ value, onChange, placeholder, className = "", previewClassName = "" }: EditableTextProps) {
  const [localValue, setLocalValue] = useState(value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      const textHeight = textareaRef.current.scrollHeight
      const previewHeight = previewRef.current?.scrollHeight || 0
      textareaRef.current.style.height = `${Math.max(textHeight, previewHeight)}px`
    }
  }, [localValue])

  const handleBlur = () => {
    onChange(localValue)
  }

  return (
    <div className="editable-text-wrapper">
      <textarea
        ref={textareaRef}
        value={localValue}
        onChange={(e) => {
          const nextValue = e.target.value
          setLocalValue(nextValue)
          if (nextValue !== value) {
            onChange(nextValue)
          }
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`editable-text ${className}`}
        rows={1}
        data-has-value={localValue.length > 0}
      />
      <div
        ref={previewRef}
        className={`editable-text-preview ${previewClassName}`}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(localValue || "") }}
      />
    </div>
  )
}

// 코드 편집기
interface EditableCodeProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function EditableCode({ value, onChange, placeholder }: EditableCodeProps) {
  const [localValue, setLocalValue] = useState(value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleBlur = () => {
    onChange(localValue)
  }

  return (
    <textarea
      ref={textareaRef}
      value={localValue}
      onChange={(e) => {
        const nextValue = e.target.value
        setLocalValue(nextValue)
        if (nextValue !== value) {
          onChange(nextValue)
        }
      }}
      onBlur={handleBlur}
      placeholder={placeholder}
      className="editable-code"
      rows={4}
      spellCheck={false}
    />
  )
}

// 테이블 편집기
interface EditableTableProps {
  tableData: { headers: string[]; rows: string[][] }
  onChange: (data: { headers: string[]; rows: string[][] }) => void
}

function EditableTable({ tableData, onChange }: EditableTableProps) {
  const updateHeader = (index: number, value: string) => {
    const newHeaders = [...tableData.headers]
    newHeaders[index] = value
    onChange({ ...tableData, headers: newHeaders })
  }

  const updateCell = (rowIndex: number, cellIndex: number, value: string) => {
    const newRows = tableData.rows.map((row, rIdx) =>
      rIdx === rowIndex ? row.map((cell, cIdx) => (cIdx === cellIndex ? value : cell)) : row
    )
    onChange({ ...tableData, rows: newRows })
  }

const addColumn = () => {
  const newHeaders = [...tableData.headers, ""]
    const newRows = tableData.rows.map((row) => [...row, ""])
    onChange({ headers: newHeaders, rows: newRows })
  }

  const removeColumn = (index: number) => {
    if (tableData.headers.length <= 1) return
    const newHeaders = tableData.headers.filter((_, i) => i !== index)
    const newRows = tableData.rows.map((row) => row.filter((_, i) => i !== index))
    onChange({ headers: newHeaders, rows: newRows })
  }

const addRow = () => {
  const newRow = tableData.headers.map(() => "")
    onChange({ ...tableData, rows: [...tableData.rows, newRow] })
  }

  const removeRow = (index: number) => {
    if (tableData.rows.length <= 1) return
    const newRows = tableData.rows.filter((_, i) => i !== index)
    onChange({ ...tableData, rows: newRows })
  }

  return (
    <div className="editable-table-wrapper">
      <table className="editable-table">
        <thead>
          <tr>
            {tableData.headers.map((header, index) => (
              <th key={index}>
                <div className="table-header-cell">
                  <TableInput
                    value={header}
                    onChange={(value) => updateHeader(index, value)}
                    className="header"
                  />
                  <button
                    type="button"
                    onClick={() => removeColumn(index)}
                    className="table-remove-btn"
                    disabled={tableData.headers.length <= 1}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </th>
            ))}
            <th className="add-column-cell">
              <button type="button" onClick={addColumn} className="table-add-btn">
                <Plus className="w-4 h-4" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {tableData.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>
                  <TableInput value={cell} onChange={(value) => updateCell(rowIndex, cellIndex, value)} />
                </td>
              ))}
              <td className="row-actions-cell">
                <button
                  type="button"
                  onClick={() => removeRow(rowIndex)}
                  className="table-remove-btn"
                  disabled={tableData.rows.length <= 1}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={addRow} className="table-add-row-btn">
        <Plus className="w-4 h-4" />
        행 추가
      </button>
    </div>
  )
}

interface TableInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

function TableInput({ value, onChange, className = "" }: TableInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const placeholder = className.includes("header") ? "항목" : "값"

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      const textHeight = textareaRef.current.scrollHeight
      const previewHeight = previewRef.current?.scrollHeight || 0
      textareaRef.current.style.height = `${Math.max(textHeight, previewHeight)}px`
    }
  }, [value])

  return (
    <div className="table-input-wrapper">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`table-input ${className}`}
        rows={1}
        placeholder={placeholder}
        data-has-value={value.length > 0}
      />
      <div
        ref={previewRef}
        className={`table-input-preview ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(value || "") }}
      />
    </div>
  )
}

// 블록 추가 버튼
function AddBlockButton({ onAdd }: { onAdd: (type: ContentBlock["type"]) => void }) {
  return (
    <AddBlockMenu onSelect={onAdd}>
      <button type="button" className="add-block-btn">
        <Plus className="w-4 h-4" />
        <span>블록 추가</span>
      </button>
    </AddBlockMenu>
  )
}

// 블록 추가 메뉴
interface AddBlockMenuProps {
  onSelect: (type: ContentBlock["type"]) => void
  children: React.ReactNode
}

function AddBlockMenu({ onSelect, children }: AddBlockMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={() => onSelect("paragraph")}>
          <Type className="w-4 h-4 mr-2" />
          텍스트
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect("heading3")}>
          <Heading3 className="w-4 h-4 mr-2" />
          소제목 (H3)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect("heading4")}>
          <Heading4 className="w-4 h-4 mr-2" />
          소제목 (H4)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onSelect("info")}>
          <Info className="w-4 h-4 mr-2" />
          정보 박스
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect("warning")}>
          <AlertTriangle className="w-4 h-4 mr-2" />
          경고 박스
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onSelect("code")}>
          <Code className="w-4 h-4 mr-2" />
          코드 블록
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect("codeBox")}>
          <FileCode className="w-4 h-4 mr-2" />
          접이식 코드 박스
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onSelect("table")}>
          <Table className="w-4 h-4 mr-2" />
          테이블
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
