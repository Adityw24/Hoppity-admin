import { useEffect, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import CharacterCount from '@tiptap/extension-character-count'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  CheckCircle, XCircle, Pause, Edit3, PlusCircle,
  Bold, Italic, UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote,
  Code, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon,
  Link as LinkIcon, Highlighter, RotateCcw, RotateCw,
  MessageSquare, Send, Clock, Eye, ChevronRight,
} from 'lucide-react'

const STATUS_CONFIG = {
  draft:    { label: 'Draft',    color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  pending:  { label: 'Pending',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  approved: { label: 'Approved', color: '#16a34a', bg: 'rgba(22,163,74,0.12)'  },
  on_hold:  { label: 'On Hold',  color: '#d97706', bg: 'rgba(217,119,6,0.12)'  },
  rejected: { label: 'Rejected', color: '#dc2626', bg: 'rgba(220,38,38,0.12)'  },
}

const CATEGORIES = ['Heritage', 'Trekking', 'Adventure', 'Wildlife', 'Culinary', 'Spiritual', 'Cultural']

// ── Toolbar button ────────────────────────────────────────────────────
function TBtn({ onClick, active, disabled, title, children }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 6, border: 'none',
      background: active ? 'rgba(124,58,237,0.15)' : 'transparent',
      color: active ? 'var(--purple)' : 'var(--text-dim)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1, transition: 'all 0.1s',
      fontFamily: 'DM Sans, sans-serif',
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(124,58,237,0.08)' }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
      {children}
    </button>
  )
}

// ── TipTap Editor ─────────────────────────────────────────────────────
function RichEditor({ content, onChange, readOnly = false }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: false }),
      Underline,
      Image.configure({ resizable: true }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write your story here…' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      CharacterCount,
    ],
    content: content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      attributes: {
        style: 'outline: none; min-height: 400px; padding: 16px; font-size: 15px; line-height: 1.75; font-family: DM Sans, sans-serif;',
      },
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) editor.commands.setContent(content || '')
  }, [content])

  const addImage = useCallback(() => {
    const url = window.prompt('Image URL:')
    if (url && editor) editor.chain().focus().setImage({ src: url }).run()
  }, [editor])

  const setLink = useCallback(() => {
    const url = window.prompt('URL:')
    if (url && editor) editor.chain().focus().setLink({ href: url }).run()
    else if (editor) editor.chain().focus().unsetLink().run()
  }, [editor])

  const uploadImage = useCallback(async () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return
      const compressed = await compressImage(file, 1280, 0.78)
      const { data: { session } } = await supabase.auth.getSession()
      const path = `${session.user.id}/${Date.now()}.jpg`
      const { error } = await supabase.storage.from('blog-media').upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('blog-media').getPublicUrl(path)
        if (editor) editor.chain().focus().setImage({ src: data.publicUrl }).run()
      }
    }
    input.click()
  }, [editor])

  if (!editor) return <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>Loading editor…</div>

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface)' }}>
      {!readOnly && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, padding: '6px 8px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <TBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><UnderlineIcon size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Strikethrough size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight"><Highlighter size={14} /></TBtn>
          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '3px 4px' }} />
          <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="H1"><Heading1 size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="H2"><Heading2 size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="H3"><Heading3 size={14} /></TBtn>
          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '3px 4px' }} />
          <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullets"><List size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered"><ListOrdered size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote"><Quote size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code"><Code size={14} /></TBtn>
          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '3px 4px' }} />
          <TBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Left"><AlignLeft size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center"><AlignCenter size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Right"><AlignRight size={14} /></TBtn>
          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '3px 4px' }} />
          <TBtn onClick={uploadImage} title="Upload image"><ImageIcon size={14} /></TBtn>
          <TBtn onClick={addImage} title="Image from URL"><LinkIcon size={14} /></TBtn>
          <TBtn onClick={setLink} active={editor.isActive('link')} title="Add link"><LinkIcon size={14} /></TBtn>
          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '3px 4px' }} />
          <TBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><RotateCcw size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><RotateCw size={14} /></TBtn>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', paddingRight: 4 }}>
            {editor.storage.characterCount.words()} words
          </div>
        </div>
      )}
      <div className="tiptap-editor" style={{ maxHeight: readOnly ? 'none' : 500, overflowY: 'auto' }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

async function compressImage(file, maxSide = 1280, quality = 0.78) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > height && width > maxSide) { height = Math.round(height * maxSide / width); width = maxSide }
        else if (height > maxSide) { width = Math.round(width * maxSide / height); height = maxSide }
        canvas.width = width; canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        canvas.toBlob(resolve, 'image/jpeg', quality)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

// ── Main BlogPosts page ───────────────────────────────────────────────
export default function BlogPosts() {
  const { user } = useAuth()
  const [posts, setPosts]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [mode, setMode]                 = useState('list')  // 'list' | 'compose' | 'review'
  const [selectedPost, setSelectedPost] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Review panel state
  const [messageToAuthor, setMessageToAuthor] = useState('')
  const [sendingMessage, setSendingMessage]   = useState(false)
  const [toast, setToast]                     = useState(null)

  // Compose state
  const [composeTitle, setComposeTitle]       = useState('')
  const [composeHtml, setComposeHtml]         = useState('')
  const [composeCover, setComposeCover]       = useState('')
  const [composeCategory, setComposeCategory] = useState('')
  const [composeTags, setComposeTags]         = useState('')
  const [composeSaving, setComposeSaving]     = useState(false)

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('Blog_Posts')
      .select('*, Users!Blog_Posts_author_id_fkey(full_name, username, email, profile_pic, is_creator)')
      .order('created_at', { ascending: false })
    setPosts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = statusFilter === 'All' ? posts : posts.filter(p => p.status === statusFilter)
  const counts   = {}
  posts.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1 })
  const pendingCount = counts['pending'] || 0

  // ── Core review action (approve / on_hold / rejected) ────────────────
  const takeAction = async (action) => {
    if (!selectedPost || actionLoading) return
    setActionLoading(true)

    const payload = {
      admin_notes:  messageToAuthor.trim() || null,
      reviewed_by:  user.email,
      reviewed_at:  new Date().toISOString(),
      status:       action === 'approved' ? 'approved' : action,
      ...(action === 'approved' ? { published_at: new Date().toISOString() } : {}),
    }

    const { error } = await supabase.from('Blog_Posts').update(payload).eq('id', selectedPost.id)

    if (error) {
      // Common error: if blog_post_before_save trigger fails (e.g. updated_at column)
      showToast('Failed: ' + (error.message || JSON.stringify(error)), false)
      setActionLoading(false)
      return
    }

    // Send notification to author
    await supabase.rpc('notify_blog_author', {
      p_post_id: selectedPost.id,
      p_action:  action,
      p_message: messageToAuthor.trim() || null,
    })

    // Audit log
    try {
      await supabase.from('Admin_logs').insert({
        admin_email: user.email, action,
        entity_type: 'blog_post', entity_title: selectedPost.title,
        changes: { status: action, admin_notes: messageToAuthor.trim() || null },
      })
    } catch (e) { /* ignore logging errors */ }

    const labels = { approved: '✅ Approved and published!', on_hold: '⏸ Placed on hold.', rejected: '✗ Rejected.' }
    showToast((labels[action] || 'Done.') + ' Author has been notified.')
    setActionLoading(false)
    setSelectedPost(null)
    setMessageToAuthor('')
    setMode('list')
    load()
  }

  // ── Send a message without changing status ───────────────────────────
  const sendMessage = async () => {
    if (!messageToAuthor.trim() || !selectedPost || sendingMessage) return
    setSendingMessage(true)

    // Save message to admin_notes
    await supabase.from('Blog_Posts').update({
      admin_notes: messageToAuthor.trim(),
      reviewed_by: user.email,
      reviewed_at: new Date().toISOString(),
    }).eq('id', selectedPost.id)

    // Notify the author
    await supabase.rpc('notify_blog_author', {
      p_post_id: selectedPost.id,
      p_action:  'comment',
      p_message: messageToAuthor.trim(),
    })

    try {
      await supabase.from('Admin_logs').insert({
        admin_email: user.email, action: 'comment',
        entity_type: 'blog_post', entity_title: selectedPost.title,
      })
    } catch (e) { /* ignore logging errors */ }

    showToast('💬 Message sent to author.')
    setSendingMessage(false)
    setMessageToAuthor('')
    // Refresh selected post so previous notes show
    load()
  }

  // ── Admin compose ────────────────────────────────────────────────────
  const saveAdminPost = async (submit = false) => {
    if (!composeTitle.trim()) return alert('Add a title first')
    setComposeSaving(true)
    // Calculate read time (~200 words per minute)
    const wordCount = composeHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length
    const readTime = Math.max(1, Math.round(wordCount / 200))
    const payload = {
      author_id: user.id, title: composeTitle, content_html: composeHtml,
      cover_image_url: composeCover || null, category: composeCategory || null,
      tags: composeTags.split(',').map(t => t.trim()).filter(Boolean),
      read_time_minutes: readTime,
      status: submit ? 'approved' : 'draft',
      published_at: submit ? new Date().toISOString() : null,
      // Note: slug is auto-generated by blog_post_before_save trigger
    }
    const op = selectedPost
      ? await supabase.from('Blog_Posts').update(payload).eq('id', selectedPost.id).select('id').single()
      : await supabase.from('Blog_Posts').insert(payload).select('id').single()
    setComposeSaving(false)
    if (!op.error) { showToast(submit ? '✅ Post published!' : '📄 Draft saved.'); setMode('list'); load() }
    else showToast('Error saving: ' + (op.error.message || JSON.stringify(op.error)), false)
  }

  const openCompose = (post = null) => {
    setSelectedPost(post)
    setComposeTitle(post?.title || '')
    setComposeHtml(post?.content_html || '')
    setComposeCover(post?.cover_image_url || '')
    setComposeCategory(post?.category || '')
    setComposeTags((post?.tags || []).join(', '))
    setMessageToAuthor('')
    setMode('compose')
  }

  const s = { fontFamily: 'DM Sans, sans-serif' }

  // ── Compose view ─────────────────────────────────────────────────────
  if (mode === 'compose') {
    return (
      <div style={{ ...s, padding: '24px 32px', maxWidth: 900 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setMode('list')} style={backBtnStyle}>← Back</button>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            {selectedPost ? 'Edit Post' : 'New Blog Post'}
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FieldLabel>Cover Image URL</FieldLabel>
          <input value={composeCover} onChange={e => setComposeCover(e.target.value)}
            placeholder="https://…" style={inputStyle} />
          {composeCover && <img src={composeCover} alt="" style={{ maxHeight: 160, borderRadius: 8, objectFit: 'cover', width: '100%' }} />}
          <FieldLabel>Title *</FieldLabel>
          <input value={composeTitle} onChange={e => setComposeTitle(e.target.value)}
            placeholder="Post title…" style={{ ...inputStyle, fontSize: 18, fontWeight: 700 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><FieldLabel>Category</FieldLabel>
              <select value={composeCategory} onChange={e => setComposeCategory(e.target.value)} style={inputStyle}>
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><FieldLabel>Tags (comma-separated)</FieldLabel>
              <input value={composeTags} onChange={e => setComposeTags(e.target.value)}
                placeholder="meghalaya, trekking" style={inputStyle} />
            </div>
          </div>
          <div><FieldLabel>Content *</FieldLabel>
            <RichEditor content={composeHtml} onChange={setComposeHtml} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingBottom: 32 }}>
            <button onClick={() => saveAdminPost(false)} disabled={composeSaving} style={ghostBtnStyle}>
              {composeSaving ? 'Saving…' : 'Save Draft'}
            </button>
            <button onClick={() => saveAdminPost(true)} disabled={composeSaving} style={greenBtnStyle}>
              {composeSaving ? 'Publishing…' : 'Publish Now'}
            </button>
          </div>
        </div>
        <TipTapStyles />
      </div>
    )
  }

  // ── Review view ───────────────────────────────────────────────────────
  if (mode === 'review' && selectedPost) {
    const cfg    = STATUS_CONFIG[selectedPost.status] || STATUS_CONFIG.draft
    const author = selectedPost.Users
    const isPending = selectedPost.status === 'pending' || selectedPost.status === 'on_hold'

    return (
      <div style={{ ...s, padding: '24px 32px', maxWidth: 900 }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', top: 20, right: 24, zIndex: 100,
            padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: toast.ok ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
            border: `1px solid ${toast.ok ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`,
            color: toast.ok ? '#16a34a' : '#dc2626',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
          }}>{toast.msg}</div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => { setMode('list'); setSelectedPost(null); setMessageToAuthor('') }} style={backBtnStyle}>
            ← Back
          </button>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)', flex: 1 }}>
            {selectedPost.title}
          </h2>
          <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg }}>
            {cfg.label}
          </span>
        </div>

        {/* Cover */}
        {selectedPost.cover_image_url && (
          <img src={selectedPost.cover_image_url} alt=""
            style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 12, marginBottom: 20 }} />
        )}

        {/* Author + meta */}
        <div style={{
          display: 'flex', gap: 12, alignItems: 'center',
          padding: '12px 16px', background: 'var(--surface-2)',
          borderRadius: 10, marginBottom: 20, flexWrap: 'wrap',
        }}>
          {author?.profile_pic && (
            <img src={author.profile_pic} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {author?.full_name || author?.username || '—'}
              {author?.is_creator && (
                <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 800, color: 'white', background: 'var(--purple)', borderRadius: 4, padding: '2px 6px' }}>★ CREATOR</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {author?.email} · {selectedPost.category && `${selectedPost.category} · `}
              Submitted {new Date(selectedPost.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
            <span>👁 {selectedPost.views_count || 0}</span>
            <span>❤️ {selectedPost.likes_count || 0}</span>
            <span>💬 {selectedPost.comments_count || 0}</span>
          </div>
        </div>

        {/* Previous admin notes (if any) */}
        {selectedPost.admin_notes && (
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            padding: '12px 16px', marginBottom: 20,
            background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.25)', borderRadius: 10,
          }}>
            <MessageSquare size={14} style={{ color: '#d97706', marginTop: 2, flexShrink: 0 }} />
            <div>
              <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Previous message to author
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                {selectedPost.admin_notes}
              </p>
              {selectedPost.reviewed_by && (
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                  — {selectedPost.reviewed_by} · {selectedPost.reviewed_at ? new Date(selectedPost.reviewed_at).toLocaleDateString('en-IN') : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Content preview */}
        <RichEditor content={selectedPost.content_html} readOnly />

        {/* ── Action panel ────────────────────────────────────────── */}
        <div style={{ marginTop: 24, padding: 20, background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)' }}>

          {/* Message to author */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700,
              color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <MessageSquare size={12} />
              Message to author <span style={{ fontWeight: 400, color: 'var(--text-dim)', textTransform: 'none', letterSpacing: 0 }}>— shown in their app and website profile</span>
            </label>
            <textarea
              value={messageToAuthor}
              onChange={e => setMessageToAuthor(e.target.value)}
              rows={3}
              placeholder="Optional feedback for the author. If blank, they receive a standard message based on the action you take below."
              style={{ ...inputStyle, resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Send message only (no status change) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <button
              onClick={sendMessage}
              disabled={!messageToAuthor.trim() || sendingMessage}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8,
                border: '1px solid var(--border-active)',
                background: 'rgba(124,58,237,0.08)', color: 'var(--purple)',
                fontSize: 12, fontWeight: 700, cursor: !messageToAuthor.trim() || sendingMessage ? 'not-allowed' : 'pointer',
                opacity: !messageToAuthor.trim() || sendingMessage ? 0.5 : 1,
                fontFamily: 'DM Sans, sans-serif',
              }}>
              {sendingMessage ? 'Sending…' : <><Send size={13} /> Send message only (keep current status)</>}
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              Sends your message without changing the post status
            </span>
          </div>

          {/* Decision buttons */}
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700,
            color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Take a decision
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => takeAction('approved')}
              disabled={actionLoading || selectedPost.status === 'approved'}
              style={{
                flex: 1, minWidth: 140,
                padding: '11px 16px', borderRadius: 8, border: 'none',
                background: '#16a34a', color: 'white', fontSize: 13, fontWeight: 700,
                cursor: actionLoading || selectedPost.status === 'approved' ? 'not-allowed' : 'pointer',
                opacity: actionLoading || selectedPost.status === 'approved' ? 0.6 : 1,
                fontFamily: 'DM Sans, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              <CheckCircle size={15} />
              {actionLoading ? 'Processing…' : selectedPost.status === 'approved' ? 'Already Approved' : 'Approve & Publish'}
            </button>

            <button
              onClick={() => takeAction('on_hold')}
              disabled={actionLoading}
              style={{
                flex: 1, minWidth: 120,
                padding: '11px 16px', borderRadius: 8,
                border: '1px solid #d97706', background: 'rgba(217,119,6,0.08)',
                color: '#d97706', fontSize: 13, fontWeight: 700,
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                opacity: actionLoading ? 0.6 : 1, fontFamily: 'DM Sans, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              <Pause size={15} /> On Hold
            </button>

            <button
              onClick={() => takeAction('rejected')}
              disabled={actionLoading}
              style={{
                flex: 1, minWidth: 120,
                padding: '11px 16px', borderRadius: 8,
                border: '1px solid #dc2626', background: 'rgba(220,38,38,0.08)',
                color: '#dc2626', fontSize: 13, fontWeight: 700,
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                opacity: actionLoading ? 0.6 : 1, fontFamily: 'DM Sans, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              <XCircle size={15} /> Reject
            </button>

            <button onClick={() => openCompose(selectedPost)} style={{ ...ghostBtnStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Edit3 size={14} /> Edit content
            </button>
          </div>

          {/* Notification note */}
          <p style={{ margin: '12px 0 0', fontSize: 11, color: 'var(--text-dim)' }}>
            📲 The author will receive a notification in the app and their profile on the website when you take any action above.
          </p>
        </div>

        <TipTapStyles />
      </div>
    )
  }

  // ── List view ─────────────────────────────────────────────────────────
  return (
    <div style={{ ...s, padding: '28px 32px', maxWidth: 1100 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 100,
          padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: toast.ok ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
          border: `1px solid ${toast.ok ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`,
          color: toast.ok ? '#16a34a' : '#dc2626',
          boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
        }}>{toast.msg}</div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Blog Posts</h1>
            {pendingCount > 0 && (
              <span style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800,
                color: 'white', background: '#3b82f6',
                animation: 'pulse 2s infinite',
              }}>
                {pendingCount} pending review
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Review community stories · Approve, hold, reject, or message the author
          </p>
        </div>
        <button onClick={() => openCompose()} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 18px', borderRadius: 10, border: 'none',
          background: 'var(--purple)', color: 'white', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
        }}>
          <PlusCircle size={15} /> New Post
        </button>
      </div>

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {['All', 'pending', 'approved', 'on_hold', 'rejected', 'draft'].map(f => {
          const active = statusFilter === f
          const cfg    = f === 'All' ? null : STATUS_CONFIG[f]
          const count  = f === 'All' ? posts.length : (counts[f] || 0)
          return (
            <button key={f} onClick={() => setStatusFilter(f)} style={{
              padding: '5px 14px', borderRadius: 20,
              border: `2px solid ${active ? (cfg?.color || 'var(--purple)') : 'var(--border)'}`,
              background: active ? (cfg?.bg || 'var(--surface-2)') : 'transparent',
              color: active ? (cfg?.color || 'var(--purple)') : 'var(--text-muted)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {f === 'pending' && count > 0 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />}
              {f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
              <span style={{
                background: active ? (cfg?.color || 'var(--purple)') : 'var(--border)',
                color: active ? 'white' : 'var(--text-muted)',
                borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 700,
              }}>{count}</span>
            </button>
          )
        })}
        <button onClick={load} style={{ marginLeft: 'auto', ...ghostBtnStyle }}>↻ Refresh</button>
      </div>

      {/* Pending queue banner */}
      {pendingCount > 0 && statusFilter === 'All' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', marginBottom: 16,
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10,
          cursor: 'pointer',
        }} onClick={() => setStatusFilter('pending')}>
          <Clock size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>
              {pendingCount} {pendingCount === 1 ? 'story is' : 'stories are'} waiting for your review
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
              Authors are notified once you approve, hold, or reject.
            </span>
          </div>
          <ChevronRight size={14} style={{ color: '#3b82f6' }} />
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 14 }}>Loading posts…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 14 }}>
          No {statusFilter === 'All' ? '' : statusFilter.replace('_', ' ')} posts yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(post => {
            const cfg    = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft
            const author = post.Users
            const isPending = post.status === 'pending'
            return (
              <div key={post.id} style={{
                background: 'var(--surface)',
                border: isPending ? '1px solid rgba(59,130,246,0.35)' : '1px solid var(--border)',
                borderRadius: 12, padding: '14px 18px',
                display: 'grid', gridTemplateColumns: '56px 1fr auto',
                gap: 14, alignItems: 'start',
                boxShadow: isPending ? '0 0 0 1px rgba(59,130,246,0.1)' : 'none',
              }}>
                {/* Thumbnail */}
                <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', background: 'var(--surface-2)', flexShrink: 0 }}>
                  {post.cover_image_url
                    ? <img src={post.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📝</div>}
                </div>

                {/* Info */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{post.title}</p>
                    {isPending && <span style={{ fontSize: 10, fontWeight: 800, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 4, padding: '1px 6px' }}>NEEDS REVIEW</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap', marginBottom: 4 }}>
                    <span>👤 {author?.full_name || author?.username || '—'}</span>
                    {post.category && <span>🏷️ {post.category}</span>}
                    <span>🕐 {new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    <span>👁️ {post.views_count || 0}</span>
                    <span>❤️ {post.likes_count || 0}</span>
                    <span>💬 {post.comments_count || 0}</span>
                  </div>
                  {post.admin_notes && (
                    <p style={{ margin: 0, fontSize: 11, color: cfg.color, background: cfg.bg, padding: '3px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <MessageSquare size={10} /> {post.admin_notes.length > 80 ? post.admin_notes.slice(0, 80) + '…' : post.admin_notes}
                    </p>
                  )}
                </div>

                {/* Status + action */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '3px 10px', borderRadius: 20 }}>
                    {cfg.label}
                  </span>
                  <button
                    onClick={() => { setSelectedPost(post); setMessageToAuthor(post.admin_notes || ''); setMode('review') }}
                    style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--purple)', background: 'rgba(124,58,237,0.08)', color: 'var(--purple)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isPending ? 'Review →' : 'Open →'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <TipTapStyles />
    </div>
  )
}

// ── Shared style constants ────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--surface-2)',
  color: 'var(--text)', fontSize: 13, fontFamily: 'DM Sans, sans-serif',
  boxSizing: 'border-box',
}
const ghostBtnStyle = {
  padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text-muted)', fontSize: 12,
  fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
}
const greenBtnStyle = {
  padding: '10px 20px', borderRadius: 8, border: 'none',
  background: '#16a34a', color: 'white', fontSize: 13, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
}
const backBtnStyle = { ...ghostBtnStyle, fontSize: 12 }

function FieldLabel({ children }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {children}
    </label>
  )
}

function TipTapStyles() {
  return (
    <style>{`
      .tiptap-editor .ProseMirror h1 { font-size: 26px; font-weight: 800; margin: 20px 0 10px; }
      .tiptap-editor .ProseMirror h2 { font-size: 20px; font-weight: 700; margin: 16px 0 8px; }
      .tiptap-editor .ProseMirror h3 { font-size: 17px; font-weight: 700; margin: 14px 0 6px; }
      .tiptap-editor .ProseMirror p { margin: 0 0 12px; line-height: 1.75; }
      .tiptap-editor .ProseMirror blockquote { border-left: 3px solid #7C3AED; padding-left: 14px; color: #64748b; font-style: italic; margin: 12px 0; }
      .tiptap-editor .ProseMirror ul, .tiptap-editor .ProseMirror ol { padding-left: 24px; margin-bottom: 12px; }
      .tiptap-editor .ProseMirror li { margin-bottom: 4px; }
      .tiptap-editor .ProseMirror code { background: #F3F4F6; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
      .tiptap-editor .ProseMirror img { max-width: 100%; border-radius: 10px; margin: 8px 0; }
      .tiptap-editor .ProseMirror a { color: #7C3AED; text-decoration: underline; }
      .tiptap-editor .ProseMirror .is-editor-empty:first-child::before { color: #94a3b8; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
      mark { background-color: #fef9c3; padding: 1px 2px; border-radius: 3px; }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }
    `}</style>
  )
}
