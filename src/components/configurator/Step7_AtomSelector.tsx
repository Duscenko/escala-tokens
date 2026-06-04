import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import type { StyleDirection } from '../../types/tokens'

// ─── Atom definitions ───────────────────────────────────────────────────────

const ATOMS = [
  { key: 'Button',    label: 'Button',    category: 'Action',   recommended: ['ios26','organic','material'] },
  { key: 'Input',     label: 'Input',     category: 'Form',     recommended: ['ios26','organic','material'] },
  { key: 'Select',    label: 'Select',    category: 'Form',     recommended: ['organic','material'] },
  { key: 'Checkbox',  label: 'Checkbox',  category: 'Form',     recommended: ['ios26','material'] },
  { key: 'Toggle',    label: 'Toggle',    category: 'Form',     recommended: ['organic','material'] },
  { key: 'Badge',     label: 'Badge',     category: 'Display',  recommended: ['ios26','organic','material'] },
  { key: 'Avatar',    label: 'Avatar',    category: 'Display',  recommended: ['organic','material'] },
  { key: 'Card',      label: 'Card',      category: 'Layout',   recommended: ['organic','material'] },
  { key: 'Divider',   label: 'Divider',   category: 'Layout',   recommended: ['ios26','material'] },
  { key: 'Tooltip',   label: 'Tooltip',   category: 'Overlay',  recommended: ['organic','material'] },
  { key: 'Toast',     label: 'Toast',     category: 'Overlay',  recommended: ['organic','material'] },
  { key: 'Modal',     label: 'Modal',     category: 'Overlay',  recommended: ['ios26','organic','material'] },
  { key: 'Tabs',      label: 'Tabs',      category: 'Nav',      recommended: ['ios26','material'] },
  { key: 'Breadcrumb',label: 'Breadcrumb',category: 'Nav',      recommended: ['ios26','material'] },
  { key: 'Spinner',   label: 'Spinner',   category: 'Feedback', recommended: ['organic','material'] },
  { key: 'Progress',  label: 'Progress',  category: 'Feedback', recommended: ['ios26','organic','material'] },
] as const

const CATEGORIES = ['Action', 'Form', 'Display', 'Layout', 'Overlay', 'Nav', 'Feedback'] as const

// ─── Per-style mini previews ─────────────────────────────────────────────────

type PreviewProps = { primary: string; surface: string; text: string; border: string; radius: string }

// iOS 26 "Liquid Glass" shared tokens
const SF = '-apple-system, "SF Pro Text", "SF Pro Display", system-ui, sans-serif'
const glassFill = 'rgba(255,255,255,0.12)'
const glassBorder = '1px solid rgba(255,255,255,0.22)'
const glassBlur = 'blur(8px) saturate(170%)'
const glassInset = 'inset 0 1px 0 rgba(255,255,255,0.4)'

const PREVIEWS: Record<string, Record<StyleDirection, (p: PreviewProps) => React.ReactElement>> = {
  Button: {
    ios26: ({ primary }) => (
      <div className="flex gap-1.5" style={{ fontFamily: SF }}>
        <div className="px-3.5 py-1.5 text-[11px] font-semibold" style={{ backgroundColor: primary, color: '#fff', borderRadius: 999, boxShadow: `${glassInset}, 0 2px 8px ${primary}66` }}>Continue</div>
        <div className="px-3.5 py-1.5 text-[11px] font-medium" style={{ color: '#fff', borderRadius: 999, backgroundColor: glassFill, border: glassBorder, backdropFilter: glassBlur, WebkitBackdropFilter: glassBlur }}>Skip</div>
      </div>
    ),
    organic: ({ primary, text, border, radius }) => (
      <div className="flex gap-1.5">
        <div className="px-3 py-1.5 text-[11px] font-medium" style={{ backgroundColor: primary, color: '#fff', borderRadius: radius, boxShadow: `0 2px 8px ${primary}55` }}>Submit</div>
        <div className="px-3 py-1.5 text-[11px]" style={{ color: text, border: `1px solid ${border}`, borderRadius: radius }}>Cancel</div>
      </div>
    ),
    material: ({ primary, text, border, radius }) => (
      <div className="flex gap-1.5">
        <div className="px-3 py-1.5 text-[11px] font-medium tracking-wide" style={{ backgroundColor: primary, color: '#fff', borderRadius: radius }}>SUBMIT</div>
        <div className="px-3 py-1.5 text-[11px] font-medium tracking-wide" style={{ color: primary, border: `1px solid ${primary}44`, borderRadius: radius }}>CANCEL</div>
      </div>
    ),
  },
  Input: {
    ios26: () => (
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] w-full" style={{ fontFamily: SF, color: 'rgba(255,255,255,0.6)', borderRadius: 12, backgroundColor: glassFill, border: glassBorder, backdropFilter: glassBlur, WebkitBackdropFilter: glassBlur, boxShadow: glassInset }}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.6 }}><circle cx="5" cy="5" r="3.4" stroke="currentColor" strokeWidth="1.3" /><path d="M8 8L11 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
        Search
      </div>
    ),
    organic: ({ text, border, surface, radius }) => (
      <div className="px-3 py-2 text-[11px] w-full" style={{ color: text + '88', backgroundColor: surface, border: `1px solid ${border}`, borderRadius: radius }}>Email address…</div>
    ),
    material: ({ text, border, radius }) => (
      <div className="flex flex-col gap-0.5 w-full">
        <div className="text-[9px] uppercase tracking-widest" style={{ color: border }}>Email</div>
        <div className="px-2 py-1.5 text-[11px] w-full border-b-2" style={{ color: text, borderColor: border, backgroundColor: 'transparent' }}>user@email.com</div>
      </div>
    ),
  },
  Select: {
    ios26: () => (
      <div className="px-3 py-1.5 text-[11px] flex justify-between items-center w-full" style={{ fontFamily: SF, color: '#fff', borderRadius: 12, backgroundColor: glassFill, border: glassBorder, backdropFilter: glassBlur, WebkitBackdropFilter: glassBlur, boxShadow: glassInset }}>
        <span>Option A</span>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.65 }}><path d="M3.5 5L6 2.5L8.5 5M3.5 7L6 9.5L8.5 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
    ),
    organic: ({ text, border, radius }) => (
      <div className="px-3 py-1.5 text-[11px] flex justify-between w-full" style={{ color: text, border: `1px solid ${border}`, borderRadius: radius }}>
        <span>Choose one…</span><span style={{ color: border }}>↕</span>
      </div>
    ),
    material: ({ text, border }) => (
      <div className="px-2 py-1.5 text-[11px] flex justify-between w-full border-b-2" style={{ color: text, borderColor: border }}>
        <span>Option A</span><span style={{ color: border }}>▾</span>
      </div>
    ),
  },
  Checkbox: {
    ios26: ({ primary, text }) => (
      <div className="flex items-center gap-2" style={{ fontFamily: SF }}>
        <div className="w-4 h-4 flex items-center justify-center rounded-md" style={{ backgroundColor: primary, boxShadow: `${glassInset}, 0 1px 4px ${primary}66` }}>
          <span className="text-[9px] text-white font-bold">✓</span>
        </div>
        <span className="text-[11px]" style={{ color: text }}>Accept terms</span>
      </div>
    ),
    organic: ({ primary, text }) => (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 flex items-center justify-center" style={{ backgroundColor: primary, borderRadius: 4, boxShadow: `0 1px 4px ${primary}55` }}>
          <span className="text-[9px] text-white font-bold">✓</span>
        </div>
        <span className="text-[11px]" style={{ color: text }}>Accept terms</span>
      </div>
    ),
    material: ({ primary, text }) => (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 flex items-center justify-center rounded-sm" style={{ backgroundColor: primary }}>
          <span className="text-[9px] text-white font-bold">✓</span>
        </div>
        <span className="text-[11px]" style={{ color: text }}>Accept terms</span>
      </div>
    ),
  },
  Toggle: {
    ios26: ({ primary, text }) => (
      <div className="flex items-center gap-2" style={{ fontFamily: SF }}>
        <div className="w-9 h-5 flex items-center px-0.5 rounded-full" style={{ backgroundColor: primary, boxShadow: `inset 0 1px 3px ${primary}88, 0 1px 4px ${primary}55` }}>
          <div className="w-4 h-4 rounded-full ml-auto bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.35)' }} />
        </div>
        <span className="text-[11px]" style={{ color: text }}>On</span>
      </div>
    ),
    organic: ({ primary, text }) => (
      <div className="flex items-center gap-2">
        <div className="w-9 h-5 flex items-center px-0.5 rounded-full" style={{ backgroundColor: primary, boxShadow: `0 1px 6px ${primary}55` }}>
          <div className="w-3.5 h-3.5 rounded-full ml-auto bg-white shadow" />
        </div>
        <span className="text-[11px]" style={{ color: text }}>Enabled</span>
      </div>
    ),
    material: ({ primary, text }) => (
      <div className="flex items-center gap-2">
        <div className="w-9 h-5 flex items-center px-0.5 rounded-full" style={{ backgroundColor: primary + 'aa' }}>
          <div className="w-4 h-4 rounded-full ml-auto" style={{ backgroundColor: primary, boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
        </div>
        <span className="text-[11px]" style={{ color: text }}>Active</span>
      </div>
    ),
  },
  Badge: {
    ios26: ({ primary }) => (
      <div className="flex gap-1.5 flex-wrap" style={{ fontFamily: SF }}>
        <span className="px-2.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: primary, color: '#fff', borderRadius: 999, boxShadow: glassInset }}>New</span>
        <span className="px-2.5 py-0.5 text-[10px] font-medium" style={{ color: '#fff', borderRadius: 999, backgroundColor: glassFill, border: glassBorder, backdropFilter: glassBlur, WebkitBackdropFilter: glassBlur }}>Draft</span>
      </div>
    ),
    organic: ({ primary, text, border }) => (
      <div className="flex gap-1.5 flex-wrap">
        <span className="px-2.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: primary + '33', color: primary, borderRadius: 999 }}>New</span>
        <span className="px-2.5 py-0.5 text-[10px]" style={{ color: text, border: `1px solid ${border}`, borderRadius: 999 }}>Draft</span>
      </div>
    ),
    material: ({ primary, text, border }) => (
      <div className="flex gap-1.5 flex-wrap">
        <span className="px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase" style={{ backgroundColor: primary, color: '#fff', borderRadius: 4 }}>New</span>
        <span className="px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase" style={{ color: text, border: `1px solid ${border}`, borderRadius: 4 }}>Draft</span>
      </div>
    ),
  },
  Avatar: {
    ios26: ({ primary, text }) => (
      <div className="flex items-center gap-2" style={{ fontFamily: SF }}>
        <div className="w-8 h-8 flex items-center justify-center text-[11px] font-semibold rounded-full" style={{ background: `linear-gradient(140deg, ${primary}, ${primary}aa)`, color: '#fff', boxShadow: `${glassInset}, 0 2px 8px ${primary}55` }}>CD</div>
        <span className="text-[11px]" style={{ color: text }}>Cesar D.</span>
      </div>
    ),
    organic: ({ primary, text }) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 flex items-center justify-center text-[11px] font-medium rounded-full" style={{ backgroundColor: primary, color: '#fff', boxShadow: `0 2px 8px ${primary}55` }}>CD</div>
        <span className="text-[11px]" style={{ color: text }}>Cesar D.</span>
      </div>
    ),
    material: ({ primary, text }) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 flex items-center justify-center text-[11px] font-medium rounded-full" style={{ backgroundColor: primary + 'dd', color: '#fff' }}>CD</div>
        <span className="text-[11px]" style={{ color: text }}>Cesar D.</span>
      </div>
    ),
  },
  Card: {
    ios26: ({ text }) => (
      <div className="p-3 w-full" style={{ fontFamily: SF, borderRadius: 18, backgroundColor: glassFill, border: glassBorder, backdropFilter: glassBlur, WebkitBackdropFilter: glassBlur, boxShadow: `${glassInset}, 0 8px 24px rgba(0,0,0,0.28)` }}>
        <div className="text-[11px] font-semibold" style={{ color: text }}>Card Title</div>
        <div className="text-[10px] mt-1" style={{ color: text + '99' }}>Translucent surface with concentric radii.</div>
      </div>
    ),
    organic: ({ text, border, surface, radius }) => (
      <div className="p-3 w-full" style={{ backgroundColor: surface, borderRadius: radius, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', border: `1px solid ${border}` }}>
        <div className="text-[11px] font-semibold" style={{ color: text }}>Card Title</div>
        <div className="text-[10px] mt-1" style={{ color: text + '88' }}>Supporting content with a soft elevated surface.</div>
      </div>
    ),
    material: ({ text, border, surface }) => (
      <div className="p-2.5 w-full" style={{ backgroundColor: surface, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.2)', border: `1px solid ${border}` }}>
        <div className="text-[11px] font-medium" style={{ color: text }}>Card Title</div>
        <div className="text-[10px] mt-0.5" style={{ color: text + '77' }}>Elevated surface, clear hierarchy.</div>
      </div>
    ),
  },
  Divider: {
    ios26: ({ text }) => (
      <div className="w-full flex items-center gap-2" style={{ fontFamily: SF }}>
        <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
        <span className="text-[10px]" style={{ color: text + '99' }}>or</span>
        <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
      </div>
    ),
    organic: ({ border, text }) => (
      <div className="w-full flex items-center gap-2">
        <div className="flex-1 h-px" style={{ backgroundColor: border + '66' }} />
        <span className="text-[10px]" style={{ color: text + '88' }}>or</span>
        <div className="flex-1 h-px" style={{ backgroundColor: border + '66' }} />
      </div>
    ),
    material: ({ border, text }) => (
      <div className="w-full flex items-center gap-2">
        <div className="flex-1 h-px" style={{ backgroundColor: border }} />
        <span className="text-[9px] uppercase tracking-widest" style={{ color: text + '66' }}>Section</span>
        <div className="flex-1 h-px" style={{ backgroundColor: border }} />
      </div>
    ),
  },
  Tooltip: {
    ios26: () => (
      <div className="flex flex-col items-center gap-1" style={{ fontFamily: SF }}>
        <div className="px-3 py-1.5 text-[10px]" style={{ color: '#fff', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)', border: glassBorder, backdropFilter: glassBlur, WebkitBackdropFilter: glassBlur, boxShadow: `${glassInset}, 0 4px 16px rgba(0,0,0,0.3)` }}>Keyboard shortcut ⌘K</div>
        <div className="w-2 h-2 rotate-45" style={{ backgroundColor: 'rgba(255,255,255,0.16)', borderRight: glassBorder, borderBottom: glassBorder, marginTop: -5 }} />
      </div>
    ),
    organic: ({ text, radius }) => (
      <div className="flex flex-col items-center gap-1">
        <div className="px-3 py-1.5 text-[10px]" style={{ backgroundColor: '#1a1a1acc', color: text, borderRadius: radius, backdropFilter: 'blur(4px)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>Keyboard shortcut ⌘K</div>
        <div className="w-1.5 h-1.5 rotate-45 bg-neutral-800" style={{ marginTop: -5 }} />
      </div>
    ),
    material: ({ text }) => (
      <div className="flex flex-col items-center gap-1">
        <div className="px-2.5 py-1 text-[10px] rounded" style={{ backgroundColor: '#323232', color: '#fff' }}>⌘K — Command palette</div>
        <div className="w-1.5 h-1.5 rotate-45 bg-neutral-700" style={{ marginTop: -5 }} />
      </div>
    ),
  },
  Toast: {
    ios26: ({ primary, text }) => (
      <div className="px-3 py-2 flex items-center gap-2 w-full" style={{ fontFamily: SF, borderRadius: 999, backgroundColor: glassFill, border: glassBorder, backdropFilter: glassBlur, WebkitBackdropFilter: glassBlur, boxShadow: `${glassInset}, 0 8px 24px rgba(0,0,0,0.3)` }}>
        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: primary, boxShadow: glassInset }}>
          <span className="text-[8px] text-white font-bold">✓</span>
        </div>
        <span className="text-[10px]" style={{ color: text }}>Changes saved</span>
      </div>
    ),
    organic: ({ primary, text, radius }) => (
      <div className="px-3 py-2 flex items-center gap-2 w-full" style={{ backgroundColor: '#1a1a1a', borderRadius: radius, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', border: `1px solid ${primary}33` }}>
        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: primary }}>
          <span className="text-[8px] text-white font-bold">✓</span>
        </div>
        <span className="text-[10px]" style={{ color: text }}>Changes saved</span>
      </div>
    ),
    material: ({ primary }) => (
      <div className="px-3 py-2 flex items-center justify-between gap-2 w-full rounded" style={{ backgroundColor: '#323232' }}>
        <span className="text-[10px]" style={{ color: '#fff' }}>Changes saved successfully</span>
        <span className="text-[10px] font-medium" style={{ color: primary }}>UNDO</span>
      </div>
    ),
  },
  Modal: {
    ios26: ({ text, primary }) => (
      <div className="p-3 w-full" style={{ fontFamily: SF, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.14)', border: glassBorder, backdropFilter: glassBlur, WebkitBackdropFilter: glassBlur, boxShadow: `${glassInset}, 0 16px 40px rgba(0,0,0,0.4)` }}>
        <div className="text-[11px] font-semibold mb-1" style={{ color: text }}>Confirm action</div>
        <div className="text-[10px] mb-2.5" style={{ color: text + '99' }}>This cannot be undone.</div>
        <div className="flex gap-1.5">
          <div className="px-3 py-1 text-[10px] font-semibold" style={{ backgroundColor: primary, color: '#fff', borderRadius: 999, boxShadow: glassInset }}>Confirm</div>
          <div className="px-3 py-1 text-[10px] font-medium" style={{ color: '#fff', borderRadius: 999, backgroundColor: glassFill, border: glassBorder }}>Cancel</div>
        </div>
      </div>
    ),
    organic: ({ text, border, surface, primary, radius }) => (
      <div className="p-3 w-full" style={{ backgroundColor: surface, borderRadius: radius, boxShadow: '0 20px 40px rgba(0,0,0,0.5)', border: `1px solid ${border}` }}>
        <div className="text-[11px] font-semibold mb-1" style={{ color: text }}>Confirm action</div>
        <div className="text-[10px] mb-2" style={{ color: text + '88' }}>This cannot be undone.</div>
        <div className="flex gap-1.5">
          <div className="px-2.5 py-1 text-[10px] font-medium" style={{ backgroundColor: primary, color: '#fff', borderRadius: 999 }}>Confirm</div>
          <div className="px-2.5 py-1 text-[10px]" style={{ color: text, border: `1px solid ${border}`, borderRadius: 999 }}>Cancel</div>
        </div>
      </div>
    ),
    material: ({ text, border, surface, primary }) => (
      <div className="p-3 w-full rounded-lg" style={{ backgroundColor: surface, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', border: `1px solid ${border}` }}>
        <div className="text-[11px] font-medium mb-1" style={{ color: text }}>Confirm action</div>
        <div className="text-[10px] mb-2.5" style={{ color: text + '77' }}>This cannot be undone.</div>
        <div className="flex gap-2 justify-end">
          <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: text + '88' }}>Cancel</span>
          <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: primary }}>Confirm</span>
        </div>
      </div>
    ),
  },
  Tabs: {
    ios26: ({ text }) => (
      <div className="w-full" style={{ fontFamily: SF }}>
        <div className="flex gap-1 p-1 rounded-full" style={{ backgroundColor: glassFill, border: glassBorder, backdropFilter: glassBlur, WebkitBackdropFilter: glassBlur }}>
          {['Overview','Details','Logs'].map((t, i) => (
            <div key={t} className="px-3 py-1 text-[10px] font-medium flex-1 text-center" style={{ color: '#fff', borderRadius: 999, backgroundColor: i === 0 ? 'rgba(255,255,255,0.25)' : 'transparent', border: i === 0 ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent', boxShadow: i === 0 ? glassInset : 'none' }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    organic: ({ primary, text, border }) => (
      <div className="w-full">
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: border + '22' }}>
          {['Overview','Details','Logs'].map((t, i) => (
            <div key={t} className="px-3 py-1 text-[10px] font-medium flex-1 text-center" style={{ backgroundColor: i === 0 ? primary : 'transparent', color: i === 0 ? '#fff' : text + '88', borderRadius: 8, boxShadow: i === 0 ? `0 1px 4px ${primary}44` : 'none' }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    material: ({ primary, text, border }) => (
      <div className="w-full">
        <div className="flex" style={{ borderBottom: `1px solid ${border}` }}>
          {['Overview','Details','Logs'].map((t, i) => (
            <div key={t} className="px-3 py-1.5 text-[10px] font-medium tracking-wide uppercase" style={{ color: i === 0 ? primary : text + '66', borderBottom: i === 0 ? `2px solid ${primary}` : '2px solid transparent', marginBottom: -1 }}>{t}</div>
          ))}
        </div>
      </div>
    ),
  },
  Breadcrumb: {
    ios26: ({ text, primary }) => (
      <div className="flex items-center gap-1 text-[10px]" style={{ fontFamily: SF }}>
        {['Home','Products','Item'].map((s, i, arr) => (
          <span key={s} className="flex items-center gap-1">
            <span style={{ color: i === arr.length - 1 ? primary : text + '88', fontWeight: i === arr.length - 1 ? 600 : 400 }}>{s}</span>
            {i < arr.length - 1 && <span style={{ color: text + '44' }}>›</span>}
          </span>
        ))}
      </div>
    ),
    organic: ({ text, primary }) => (
      <div className="flex items-center gap-1 text-[10px]">
        {['Home','Products','Item'].map((s, i, arr) => (
          <span key={s} className="flex items-center gap-1">
            <span style={{ color: i === arr.length - 1 ? primary : text + '66' }}>{s}</span>
            {i < arr.length - 1 && <span style={{ color: text + '44' }}>{'/'}</span>}
          </span>
        ))}
      </div>
    ),
    material: ({ text, primary }) => (
      <div className="flex items-center gap-1 text-[10px]">
        {['Home','Products','Item'].map((s, i, arr) => (
          <span key={s} className="flex items-center gap-1">
            <span style={{ color: i === arr.length - 1 ? primary : text + '66' }}>{s}</span>
            {i < arr.length - 1 && <span style={{ color: text + '33' }}>›</span>}
          </span>
        ))}
      </div>
    ),
  },
  Spinner: {
    ios26: ({ primary, text }) => (
      <div className="flex items-center gap-2" style={{ fontFamily: SF }}>
        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: primary }} />
        <span className="text-[10px]" style={{ color: text + '99' }}>Loading…</span>
      </div>
    ),
    organic: ({ primary, text }) => (
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: primary + '44', borderTopColor: primary }} />
        <span className="text-[10px]" style={{ color: text + '88' }}>Loading…</span>
      </div>
    ),
    material: ({ primary, text }) => (
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: primary + '33', borderTopColor: primary }} />
        <span className="text-[10px] uppercase tracking-widest" style={{ color: text + '66' }}>Loading</span>
      </div>
    ),
  },
  Progress: {
    ios26: ({ primary, text }) => (
      <div className="flex flex-col gap-1 w-full" style={{ fontFamily: SF }}>
        <div className="flex justify-between text-[10px]" style={{ color: text + '99' }}>
          <span>Progress</span><span>72%</span>
        </div>
        <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
          <div className="h-full rounded-full" style={{ width: '72%', backgroundColor: primary, boxShadow: `${glassInset}, 0 0 8px ${primary}66` }} />
        </div>
      </div>
    ),
    organic: ({ primary, text }) => (
      <div className="flex flex-col gap-1 w-full">
        <div className="flex justify-between text-[10px]" style={{ color: text + '88' }}>
          <span>Progress</span><span>72%</span>
        </div>
        <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: primary + '22' }}>
          <div className="h-full rounded-full" style={{ width: '72%', backgroundColor: primary, boxShadow: `0 0 8px ${primary}66` }} />
        </div>
      </div>
    ),
    material: ({ primary, text }) => (
      <div className="flex flex-col gap-1 w-full">
        <div className="flex justify-between text-[10px] uppercase tracking-wide" style={{ color: text + '66' }}>
          <span>Uploading</span><span>72%</span>
        </div>
        <div className="h-1 w-full rounded-full overflow-hidden" style={{ backgroundColor: primary + '33' }}>
          <div className="h-full" style={{ width: '72%', backgroundColor: primary }} />
        </div>
      </div>
    ),
  },
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function Step7_AtomSelector() {
  const { selectedAtoms, toggleAtom, setSelectedAtoms, styleDirection, semanticTokens, primaryColor, radius } =
    useDesignStore()

  const dir: StyleDirection = styleDirection ?? 'material'
  const tokens = {
    primary: semanticTokens.primary || primaryColor || '#3B82F6',
    surface: semanticTokens.surface || '#1a1a1a',
    text:    semanticTokens.text    || '#ffffff',
    border:  semanticTokens.border  || '#333333',
    radius:  radius.md || '8px',
  }

  const recommended = ATOMS.filter((a) => (a.recommended as readonly string[]).includes(dir)).map((a) => a.key)

  // Auto-select recommended on first visit (empty selection)
  useEffect(() => {
    if (selectedAtoms.length === 0) {
      setSelectedAtoms(recommended)
    }
  }, [])

  // Confirmation state for destructive "reset to recommended"
  const [confirmReset, setConfirmReset] = useState(false)

  function handleSelectRecommended() {
    const rec = recommended as string[]
    const hasCustom = selectedAtoms.some((a) => !rec.includes(a))
    const hasMissing = rec.some((a) => !selectedAtoms.includes(a))

    if (!hasCustom && !hasMissing) return // already matches

    if (confirmReset) {
      setSelectedAtoms(recommended)
      setConfirmReset(false)
    } else {
      setConfirmReset(true)
      setTimeout(() => setConfirmReset(false), 3000)
    }
  }

  function selectAll() {
    setSelectedAtoms(ATOMS.map((a) => a.key))
  }

  function clearAll() {
    setSelectedAtoms([])
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-6"
    >
      {/* Header + actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {selectedAtoms.length === 0
            ? 'No atoms selected — none will be exported.'
            : `${selectedAtoms.length} atom${selectedAtoms.length > 1 ? 's' : ''} selected`}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleSelectRecommended}
            className={`text-xs px-2.5 py-1 rounded transition border ${
              confirmReset
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border-neutral-700'
            }`}
          >
            {confirmReset ? 'Confirm reset?' : 'Recommended'}
          </button>
          <button onClick={selectAll} className="text-xs px-2.5 py-1 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition border border-neutral-700">
            All
          </button>
          <button onClick={clearAll} className="text-xs px-2.5 py-1 rounded bg-neutral-900 text-neutral-500 hover:text-neutral-300 transition border border-neutral-800">
            Clear
          </button>
        </div>
      </div>

      {/* Atoms by category */}
      {CATEGORIES.map((cat) => {
        const catAtoms = ATOMS.filter((a) => a.category === cat)
        return (
          <div key={cat} className="flex flex-col gap-2">
            <span className="text-[11px] text-neutral-600 uppercase tracking-widest">{cat}</span>
            <div className="grid grid-cols-2 gap-2">
              {catAtoms.map((atom, i) => {
                const isSelected = selectedAtoms.includes(atom.key)
                const isRec = recommended.includes(atom.key)
                const PreviewFn = PREVIEWS[atom.key]?.[dir]

                return (
                  <motion.button
                    key={atom.key}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => toggleAtom(atom.key)}
                    className={`text-left rounded-xl p-3 flex flex-col gap-3 transition-all ${
                      isSelected
                        ? 'bg-neutral-800 ring-2 ring-violet-500/50 border border-violet-500/20'
                        : 'bg-neutral-900 border border-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    <div className="pointer-events-none select-none min-h-[52px] flex items-center w-full overflow-hidden">
                      {PreviewFn ? (
                        <PreviewFn {...tokens} />
                      ) : (
                        <div className="text-xs text-neutral-700 font-mono">{atom.key}</div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-neutral-400'}`}>
                          {atom.label}
                        </span>
                        {isRec && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-violet-500/15 text-violet-400">
                            rec
                          </span>
                        )}
                      </div>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                          isSelected ? 'bg-violet-500' : 'bg-neutral-800 border border-neutral-700'
                        }`}
                      >
                        {isSelected && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Selection summary */}
      <AnimatePresence>
        {selectedAtoms.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg bg-neutral-900 border border-neutral-800 p-4"
          >
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Selected atoms</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedAtoms.map((a) => (
                <span key={a} className="text-xs px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 font-medium">
                  {a}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
