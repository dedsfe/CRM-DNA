import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Extension } from '@tiptap/core';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { getMentionSuggestion } from '../lib/mentionSuggestion';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight,
  Highlighter, Palette, Type, StickyNote, Square, Circle, Diamond,
  Trash2, Undo, Redo, Download, MousePointer2, Hand, PenTool,
  Lock, Unlock, ArrowUpToLine, ArrowDownToLine, Copy, ChevronLeft, MessageSquare,
  ThumbsUp, Search, Mail, Camera, LayoutTemplate, ShoppingBag, Video, CreditCard, CheckCircle, BadgeDollarSign, UserPlus, Play,
  Globe, Megaphone, Rss, MessageCircle, Share2, Smartphone
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import './Whiteboard.css';

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] } },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
          renderHTML: attributes => {
            if (!attributes.fontSize) return {}
            return { style: `font-size: ${attributes.fontSize}` }
          },
        },
      },
    }]
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    }
  },
});

// ============================================================
// 🚀 FUNNEL NODE REGISTRY (Estilo Funnelytics)
// ============================================================
const FUNNEL_NODES = {
  // --- TRAFFIC SOURCES ---
  'traffic-facebook': {
    label: 'Facebook Ads',
    category: 'traffic',
    brandColor: '#1877F2',
    icon: (size = 80) => (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <rect x="5" y="10" width="70" height="60" rx="8" fill="#ffffff" stroke="#1877F2" strokeWidth="2.5" />
        <rect x="5" y="10" width="70" height="15" rx="0" fill="#f8fafc" />
        <line x1="5" y1="25" x2="75" y2="25" stroke="#e2e8f0" strokeWidth="1.5" />
        <circle cx="20" cy="40" r="10" fill="#1877F2" />
        <path d="M22 50h-3V39h-2v-3h2v-2.5c0-2.5 1-4 3.5-4h2.5v3h-2c-0.8 0-1 0.5-1 1.5V36h3v3h-3V50z" fill="#ffffff" />
        <rect x="35" y="33" width="30" height="5" rx="2.5" fill="#1877F2" opacity="0.8" />
        <rect x="35" y="43" width="22" height="4" rx="2" fill="#cbd5e1" />
        <circle cx="15" cy="60" r="2.5" fill="#94a3b8" />
        <circle cx="25" cy="60" r="2.5" fill="#94a3b8" />
        <circle cx="35" cy="60" r="2.5" fill="#94a3b8" />
      </svg>
    ),
  },
  'traffic-instagram': {
    label: 'Instagram',
    category: 'traffic',
    brandColor: '#E4405F',
    icon: (size = 80) => (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <defs>
          <linearGradient id="insta-grad" x1="10" y1="10" x2="70" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#833AB4" />
            <stop offset="50%" stopColor="#FD1D1D" />
            <stop offset="100%" stopColor="#FCB045" />
          </linearGradient>
        </defs>
        <rect x="18" y="4" width="44" height="72" rx="10" fill="#ffffff" stroke="#E4405F" strokeWidth="2.5" />
        <rect x="22" y="8" width="36" height="58" rx="6" fill="url(#insta-grad)" />
        <rect x="34" y="5" width="12" height="2.5" rx="1.25" fill="#e2e8f0" />
        <line x1="36" y1="71" x2="44" y2="71" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="30" y="27" width="20" height="20" rx="5.5" stroke="#ffffff" strokeWidth="2" />
        <circle cx="40" cy="37" r="5" stroke="#ffffff" strokeWidth="2" />
        <circle cx="46" cy="31" r="1.5" fill="#ffffff" />
      </svg>
    ),
  },
  'traffic-google': {
    label: 'Google Ads',
    category: 'traffic',
    brandColor: '#4285F4',
    icon: (size = 80) => (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <rect x="5" y="10" width="70" height="60" rx="8" fill="#ffffff" stroke="#4285F4" strokeWidth="2.5" />
        <rect x="5" y="10" width="70" height="15" rx="0" fill="#f8fafc" />
        <circle cx="12" cy="17.5" r="2.5" fill="#EF4444" />
        <circle cx="18" cy="17.5" r="2.5" fill="#F59E0B" />
        <circle cx="24" cy="17.5" r="2.5" fill="#10B981" />
        <line x1="5" y1="25" x2="75" y2="25" stroke="#e2e8f0" strokeWidth="1.5" />
        <rect x="12" y="32" width="56" height="8" rx="4" stroke="#cbd5e1" strokeWidth="1.5" fill="#f8fafc" />
        <rect x="12" y="46" width="14" height="7" rx="1.5" fill="#16A34A" />
        <text x="14" y="52" fill="#ffffff" fontSize="6" fontWeight="900" fontFamily="sans-serif">AD</text>
        <rect x="32" y="47" width="36" height="5" rx="2" fill="#4285F4" />
        <rect x="12" y="58" width="46" height="4" rx="2" fill="#cbd5e1" />
      </svg>
    ),
  },
  'traffic-youtube': {
    label: 'YouTube',
    category: 'traffic',
    brandColor: '#FF0000',
    icon: (size = 80) => (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <rect x="6" y="8" width="68" height="48" rx="6" fill="#1e293b" stroke="#FF0000" strokeWidth="2.5" />
        <rect x="10" y="12" width="60" height="34" rx="3" fill="#0f172a" />
        <polygon points="36,24 48,29 36,34" fill="#FF0000" />
        <polygon points="37,26 44,29 37,32" fill="#ffffff" />
        <rect x="10" y="42" width="60" height="2" fill="#475569" />
        <rect x="10" y="42" width="22" height="2" fill="#FF0000" />
        <circle cx="32" cy="43" r="2.5" fill="#FF0000" />
        <path d="M30 56h20l4 14H26l4-14z" fill="#475569" stroke="#334155" strokeWidth="2" />
        <rect x="22" y="70" width="36" height="4" rx="2" fill="#334155" />
      </svg>
    ),
  },
  'traffic-tiktok': {
    label: 'TikTok',
    category: 'traffic',
    brandColor: '#000000',
    icon: (size = 80) => (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <rect x="18" y="4" width="44" height="72" rx="10" fill="#ffffff" stroke="#000000" strokeWidth="2.5" />
        <rect x="22" y="8" width="36" height="58" rx="6" fill="#010101" />
        <rect x="34" y="5" width="12" height="2.5" rx="1.25" fill="#e2e8f0" />
        <line x1="36" y1="71" x2="44" y2="71" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
        <g transform="translate(28, 22) scale(1.0)">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" fill="#25F4EE" />
          <path d="M11.525 1.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" fill="#FE2C55" style={{ mixBlendMode: 'lighten' }} />
          <path d="M12.025.52c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" fill="#ffffff" style={{ mixBlendMode: 'lighten' }} />
        </g>
      </svg>
    ),
  },
  'traffic-email': {
    label: 'E-mail',
    category: 'traffic',
    brandColor: '#6366F1',
    icon: (size = 80) => (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <rect x="22" y="10" width="36" height="30" rx="3" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
        <line x1="28" y1="18" x2="52" y2="18" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28" y1="24" x2="46" y2="24" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28" y1="30" x2="38" y2="30" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 30h64v32a6 6 0 01-6 6H14a6 6 0 01-6-6V30z" fill="#6366F1" />
        <path d="M8 30l32 20 32-20" stroke="#4f46e5" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M8 68l26-22M72 68L46 46" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  'traffic-whatsapp': {
    label: 'WhatsApp',
    category: 'traffic',
    brandColor: '#25D366',
    icon: (size = 80) => (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <rect x="18" y="4" width="44" height="72" rx="10" fill="#ffffff" stroke="#25D366" strokeWidth="2.5" />
        <rect x="22" y="8" width="36" height="58" rx="6" fill="#25D366" />
        <rect x="34" y="5" width="12" height="2.5" rx="1.25" fill="#e2e8f0" />
        <line x1="36" y1="71" x2="44" y2="71" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M40 23c-7.7 0-14 6.3-14 14 0 2.7.8 5.3 2.2 7.5L25 54l9.8-3.1c2.1 1.2 4.6 1.9 7.2 1.9 7.7 0 14-6.3 14-14s-6.3-14-14-14zm7.5 19.3c-.3-.1-1.7-.9-2-.9-.3-.1-.5-.1-.7.2l-.9 1.1c-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5 0-.2 0-.4-.1-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.4 0-.6.3-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.1-1.4s-.3-.2-.6-.3z" fill="#ffffff" />
      </svg>
    ),
  },
  'traffic-organic': {
    label: 'Orgânico (SEO)',
    category: 'traffic',
    brandColor: '#16A34A',
    icon: (size = 80) => (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <circle cx="40" cy="36" r="26" stroke="#16A34A" strokeWidth="2.5" fill="#f0fdf4" />
        <path d="M14 36h52M40 10v52" stroke="#16A34A" strokeWidth="1.5" />
        <path d="M22 20c8 5 8 27 0 32M58 20c-8 5-8 27 0 32" stroke="#16A34A" strokeWidth="1.5" />
        <circle cx="56" cy="52" r="10" fill="#ffffff" stroke="#15803d" strokeWidth="3" />
        <line x1="63" y1="59" x2="72" y2="68" stroke="#15803d" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    ),
  },
  'traffic-linkedin': {
    label: 'LinkedIn',
    category: 'traffic',
    brandColor: '#0A66C2',
    icon: (size = 80) => (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <rect x="5" y="10" width="70" height="60" rx="8" fill="#ffffff" stroke="#0A66C2" strokeWidth="2.5" />
        <rect x="5" y="10" width="70" height="15" rx="0" fill="#f8fafc" />
        <line x1="5" y1="25" x2="75" y2="25" stroke="#e2e8f0" strokeWidth="1.5" />
        <rect x="12" y="32" width="22" height="22" rx="4" fill="#0A66C2" />
        <path d="M17.5 48.5H20V42c0-1.1-.1-2-.9-2-.8 0-1 .6-1 1.2v7.3zM15 39.5h2.5v9H15v-9zM16.2 38.3a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" fill="#ffffff" />
        <rect x="40" y="34" width="26" height="5" rx="2" fill="#0A66C2" opacity="0.8" />
        <rect x="40" y="44" width="20" height="4" rx="2" fill="#cbd5e1" />
        <rect x="40" y="52" width="14" height="4" rx="2" fill="#cbd5e1" />
      </svg>
    ),
  },
  'traffic-twitter': {
    label: 'X (Twitter)',
    category: 'traffic',
    brandColor: '#000000',
    icon: (size = 80) => (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <rect x="5" y="10" width="70" height="60" rx="8" fill="#15202B" stroke="#000000" strokeWidth="2.5" />
        <rect x="5" y="10" width="70" height="15" rx="0" fill="#192734" />
        <line x1="5" y1="25" x2="75" y2="25" stroke="#192734" strokeWidth="1.5" />
        <circle cx="20" cy="40" r="10" fill="#000000" />
        <path d="M22.5 35h-1.2l-2.2 2.5-2.6-3.4H14l3.5 4.8L14 44h1.2l2.4-2.8 2.8 3.8h2.6l-3.8-5.3L22.5 35z" fill="#ffffff" />
        <rect x="36" y="35" width="30" height="4" rx="2" fill="#ffffff" opacity="0.9" />
        <rect x="36" y="44" width="22" height="4" rx="2" fill="#8899A6" />
        <rect x="36" y="52" width="16" height="4" rx="2" fill="#8899A6" />
      </svg>
    ),
  },
  // --- PAGE NODES (Funnelytics Style) ---
  'page-optin': {
    label: 'Landing Page',
    category: 'page',
    brandColor: '#10B981',
    icon: (size = 80) => (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <rect x="5" y="10" width="70" height="60" rx="8" fill="#ffffff" stroke="#10B981" strokeWidth="2.5" />
        <rect x="5" y="10" width="70" height="15" rx="0" fill="#f0fdf4" />
        <circle cx="12" cy="17.5" r="2.5" fill="#EF4444" />
        <circle cx="18" cy="17.5" r="2.5" fill="#F59E0B" />
        <circle cx="24" cy="17.5" r="2.5" fill="#10B981" />
        <line x1="5" y1="25" x2="75" y2="25" stroke="#e2e8f0" strokeWidth="1.5" />
        <rect x="15" y="32" width="50" height="5" rx="2" fill="#10B981" />
        <rect x="15" y="42" width="50" height="10" rx="4" stroke="#cbd5e1" strokeWidth="1.5" fill="#f8fafc" />
        <circle cx="23" cy="47" r="2.5" fill="#94a3b8" />
        <rect x="30" y="45" width="25" height="4" rx="2" fill="#cbd5e1" />
        <rect x="15" y="56" width="50" height="9" rx="4.5" fill="#10B981" />
        <rect x="35" y="59" width="10" height="3" rx="1.5" fill="#ffffff" />
      </svg>
    ),
  },
  'page-sales': {
    label: 'Pág. de Vendas',
    category: 'page',
    brandColor: '#3B82F6',
    icon: (size = 80) => (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <rect x="5" y="10" width="70" height="60" rx="8" fill="#ffffff" stroke="#3B82F6" strokeWidth="2.5" />
        <rect x="5" y="10" width="70" height="15" rx="0" fill="#eff6ff" />
        <circle cx="12" cy="17.5" r="2.5" fill="#EF4444" />
        <circle cx="18" cy="17.5" r="2.5" fill="#F59E0B" />
        <circle cx="24" cy="17.5" r="2.5" fill="#10B981" />
        <line x1="5" y1="25" x2="75" y2="25" stroke="#e2e8f0" strokeWidth="1.5" />
        <rect x="12" y="32" width="28" height="20" rx="4" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1.5" />
        <polygon points="18,48 26,38 32,45 38,42" fill="#93c5fd" />
        <circle cx="32" cy="37" r="2.5" fill="#f59e0b" />
        <rect x="46" y="32" width="22" height="4" rx="2" fill="#3B82F6" />
        <rect x="46" y="40" width="22" height="3" rx="1.5" fill="#cbd5e1" />
        <rect x="46" y="46" width="16" height="3" rx="1.5" fill="#cbd5e1" />
        <rect x="12" y="58" width="56" height="8" rx="4" fill="#3B82F6" />
        <rect x="30" y="61" width="20" height="2" rx="1" fill="#ffffff" />
      </svg>
    ),
  },
  'page-vsl': {
    label: 'VSL',
    category: 'page',
    brandColor: '#EF4444',
    icon: (size = 80) => (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <rect x="5" y="10" width="70" height="60" rx="8" fill="#ffffff" stroke="#EF4444" strokeWidth="2.5" />
        <rect x="5" y="10" width="70" height="15" rx="0" fill="#fef2f2" />
        <circle cx="12" cy="17.5" r="2.5" fill="#EF4444" />
        <circle cx="18" cy="17.5" r="2.5" fill="#F59E0B" />
        <circle cx="24" cy="17.5" r="2.5" fill="#10B981" />
        <line x1="5" y1="25" x2="75" y2="25" stroke="#e2e8f0" strokeWidth="1.5" />
        <rect x="12" y="32" width="56" height="26" rx="4" fill="#0f172a" stroke="#EF4444" strokeWidth="1.5" />
        <polygon points="36,40 46,45 36,50" fill="#EF4444" />
        <rect x="16" y="54" width="48" height="2" rx="1" fill="#475569" />
        <rect x="16" y="54" width="18" height="2" rx="1" fill="#EF4444" />
        <rect x="12" y="62" width="34" height="4" rx="2" fill="#cbd5e1" />
        <rect x="50" y="62" width="18" height="4" rx="2" fill="#EF4444" />
      </svg>
    ),
  },
  'page-checkout': {
    label: 'Checkout',
    category: 'page',
    brandColor: '#8B5CF6',
    icon: (size = 80) => (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <rect x="5" y="10" width="70" height="60" rx="8" fill="#ffffff" stroke="#8B5CF6" strokeWidth="2.5" />
        <rect x="5" y="10" width="70" height="15" rx="0" fill="#f5f3ff" />
        <circle cx="12" cy="17.5" r="2.5" fill="#EF4444" />
        <circle cx="18" cy="17.5" r="2.5" fill="#F59E0B" />
        <circle cx="24" cy="17.5" r="2.5" fill="#10B981" />
        <line x1="5" y1="25" x2="75" y2="25" stroke="#e2e8f0" strokeWidth="1.5" />
        <rect x="12" y="32" width="30" height="18" rx="3" fill="#8B5CF6" />
        <rect x="16" y="36" width="6" height="4" rx="1" fill="#f5f3ff" opacity="0.8" />
        <rect x="16" y="44" width="14" height="2" rx="1" fill="#ffffff" opacity="0.8" />
        <rect x="48" y="32" width="20" height="4" rx="2" fill="#cbd5e1" />
        <rect x="48" y="40" width="20" height="4" rx="2" fill="#cbd5e1" />
        <rect x="48" y="48" width="20" height="4" rx="2" fill="#cbd5e1" />
        <rect x="12" y="56" width="56" height="10" rx="5" fill="#8B5CF6" />
        <rect x="32" y="60" width="16" height="2" rx="1" fill="#ffffff" />
      </svg>
    ),
  },
  'page-thankyou': {
    label: 'Thank You',
    category: 'page',
    brandColor: '#10B981',
    icon: (size = 80) => (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <rect x="5" y="10" width="70" height="60" rx="8" fill="#ffffff" stroke="#10B981" strokeWidth="2.5" />
        <rect x="5" y="10" width="70" height="15" rx="0" fill="#f0fdf4" />
        <circle cx="12" cy="17.5" r="2.5" fill="#EF4444" />
        <circle cx="18" cy="17.5" r="2.5" fill="#F59E0B" />
        <circle cx="24" cy="17.5" r="2.5" fill="#10B981" />
        <line x1="5" y1="25" x2="75" y2="25" stroke="#e2e8f0" strokeWidth="1.5" />
        <circle cx="40" cy="42" r="12" fill="#10B981" />
        <path d="M35 42l3 3 7-7" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="25" y="58" width="30" height="4" rx="2" fill="#10B981" />
      </svg>
    ),
  },
  // --- ACTIONS (Funnelytics Style) ---
  'action-purchase': {
    label: 'Compra',
    category: 'action',
    brandColor: '#F97316',
    icon: (size = 80) => (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <circle cx="40" cy="40" r="34" fill="#fff7ed" stroke="#f97316" strokeWidth="2.5" strokeDasharray="4 4" />
        <path d="M26 28V20a14 14 0 0128 0v8" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
        <rect x="20" y="28" width="40" height="36" rx="8" fill="#f97316" stroke="#ea580c" strokeWidth="3" />
        <circle cx="40" cy="46" r="10" fill="#fff7ed" stroke="#ea580c" strokeWidth="2" />
        <path d="M40 40v12M37 43c0-1.5 2.5-2 3-2 2 0 2 2.5 0 3s-3 1.5-3 3 2.5 2 3 2c2.5 0 2-2 2-2" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  'action-lead': {
    label: 'Lead',
    category: 'action',
    brandColor: '#F97316',
    icon: (size = 80) => (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <rect x="15" y="10" width="50" height="60" rx="8" fill="#ffffff" stroke="#f97316" strokeWidth="2.5" />
        <rect x="15" y="10" width="50" height="12" rx="0" fill="#fff7ed" />
        <line x1="15" y1="22" x2="65" y2="22" stroke="#ffedd5" strokeWidth="1.5" />
        <circle cx="40" cy="38" r="9" fill="#ffedd5" stroke="#f97316" strokeWidth="2" />
        <circle cx="40" cy="36" r="3.5" fill="#f97316" />
        <path d="M34 45a6 6 0 0112 0h-12z" fill="#f97316" />
        <circle cx="56" cy="20" r="4" fill="#22c55e" />
        <path d="M54 20l1.5 1.5 3-3" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
        <rect x="25" y="52" width="30" height="4" rx="2" fill="#f97316" />
        <rect x="30" y="60" width="20" height="3" rx="1.5" fill="#cbd5e1" />
      </svg>
    ),
  },
};;

// ============================================================
// Helper: Palette item config for the left sidebar
// ============================================================
const TRAFFIC_PALETTE_ITEMS = Object.entries(FUNNEL_NODES)
  .filter(([, v]) => v.category === 'traffic')
  .map(([key, v]) => ({ type: key, label: v.label, icon: v.icon, brandColor: v.brandColor }));

const GlobalToolbar = ({ editor, selectedNodes, selectedConnections, updateNode, updateConnection, onDelete, interactionMode, penSettings, setPenSettings, bringToFront, sendToBack, duplicateNodes }) => {
  if (interactionMode === 'drawing') {
    return (
      <div className="wb-global-toolbar">
        <div className="wb-toolbar-color-picker" title="Cor da Tinta" style={{ '--current-color': penSettings.color }}>
          <Palette size={16} />
          <input type="color" value={penSettings.color} onChange={(e) => setPenSettings(p => ({ ...p, color: e.target.value }))} />
        </div>
        <div className="wb-toolbar-divider" />
        <select className="wb-toolbar-select" value={penSettings.width} onChange={(e) => setPenSettings(p => ({ ...p, width: parseInt(e.target.value) }))} title="Grossura do Traço">
          <option value={2}>Fino (2px)</option>
          <option value={4}>Médio (4px)</option>
          <option value={8}>Grosso (8px)</option>
          <option value={12}>Marcador (12px)</option>
        </select>
      </div>
    );
  }



  if (selectedConnections?.length > 0 && selectedNodes.length === 0) {
    const activeConn = selectedConnections[0];
    return (
      <div className="wb-right-properties-panel">
        <div className="wb-prop-header">
          <h3>Propriedades da Linha</h3>
          <button onClick={onDelete} className="wb-prop-trash" title="Deletar Conexão"><Trash2 size={16} /></button>
        </div>

        <div className="wb-prop-group">
          <label>Curvatura</label>
          <div className="wb-prop-btn-group">
            <button className={activeConn.lineType === 'bezier' || !activeConn.lineType ? 'active' : ''} onClick={() => updateConnection(activeConn.id, { lineType: 'bezier' })}>Curva</button>
            <button className={activeConn.lineType === 'straight' ? 'active' : ''} onClick={() => updateConnection(activeConn.id, { lineType: 'straight' })}>Reta</button>
            <button className={activeConn.lineType === 'orthogonal' ? 'active' : ''} onClick={() => updateConnection(activeConn.id, { lineType: 'orthogonal' })}>Ortogonal</button>
          </div>
        </div>

        <div className="wb-prop-group">
          <label>Estilo do Traço</label>
          <div className="wb-prop-btn-group">
            <button className={activeConn.strokeType === 'solid' || !activeConn.strokeType ? 'active' : ''} onClick={() => updateConnection(activeConn.id, { strokeType: 'solid' })}>Sólida</button>
            <button className={activeConn.strokeType === 'dashed' ? 'active' : ''} onClick={() => updateConnection(activeConn.id, { strokeType: 'dashed' })}>Tracejada</button>
            <button className={activeConn.strokeType === 'dotted' ? 'active' : ''} onClick={() => updateConnection(activeConn.id, { strokeType: 'dotted' })}>Pontilhada</button>
          </div>
        </div>

        <div className="wb-prop-group">
          <label>Direção (Setas)</label>
          <div className="wb-prop-btn-group">
            <button className={activeConn.arrowType === 'none' ? 'active' : ''} onClick={() => updateConnection(activeConn.id, { arrowType: 'none' })}>Nenhuma</button>
            <button className={activeConn.arrowType === 'end' || !activeConn.arrowType ? 'active' : ''} onClick={() => updateConnection(activeConn.id, { arrowType: 'end' })}>Final</button>
            <button className={activeConn.arrowType === 'start' ? 'active' : ''} onClick={() => updateConnection(activeConn.id, { arrowType: 'start' })}>Início</button>
            <button className={activeConn.arrowType === 'both' ? 'active' : ''} onClick={() => updateConnection(activeConn.id, { arrowType: 'both' })}>Dupla</button>
          </div>
        </div>

        <div className="wb-prop-group-row">
          <div className="wb-prop-group half">
            <label>Espessura</label>
            <select 
              className="wb-prop-select" 
              value={activeConn.strokeWidth || 2}
              onChange={(e) => updateConnection(activeConn.id, { strokeWidth: parseInt(e.target.value) })}
            >
              <option value={1}>1px (Fina)</option>
              <option value={2}>2px (Normal)</option>
              <option value={4}>4px (Grossa)</option>
              <option value={6}>6px (Extra)</option>
            </select>
          </div>
          
          <div className="wb-prop-group half">
            <label>Cor</label>
            <div className="wb-prop-color-picker" style={{ '--current-color': activeConn.color || '#94a3b8' }}>
              <input type="color" value={activeConn.color || '#94a3b8'} onChange={(e) => updateConnection(activeConn.id, { color: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="wb-prop-group">
          <label>Métrica (Badge)</label>
          <input 
            type="text" 
            className="wb-prop-input"
            placeholder="Ex: +25%, $10k" 
            value={activeConn.badge || ''} 
            onChange={(e) => updateConnection(activeConn.id, { badge: e.target.value })} 
          />
        </div>

        <div className="wb-prop-group" style={{ marginTop: 8 }}>
          <button 
            onClick={() => updateConnection(activeConn.id, { isAnimated: !activeConn.isAnimated })} 
            className={`wb-prop-action-btn ${activeConn.isAnimated ? 'active' : ''}`}
          >
            <Play size={16} /> {activeConn.isAnimated ? 'Parar Fluxo' : 'Animar Fluxo'}
          </button>
        </div>

      </div>
    );
  }

  if (selectedNodes.length === 0) return null;

  const activeNode = selectedNodes[0];
  const disabled = !editor;

  const setNodeStyle = (key, value) => {
    selectedNodes.forEach(node => {
      updateNode(node.id, { [key]: value });
    });
  };

  const isDrawing = activeNode?.type === 'drawing';
  const isText = activeNode?.type === 'text';
  const isShape = !isDrawing && !isText;

  const def = {
    'post-it': { bg: '#FFF3B0' },
    'rounded-rect': { bg: '#ebf8ff', borderColor: '#3182ce', borderWidth: 2 },
    'circle': { bg: '#ebf8ff', borderColor: '#3182ce', borderWidth: 2 },
    'diamond': { bg: '#ebf8ff', borderColor: '#3182ce', borderWidth: 2 }
  }[activeNode?.type] || {};

  return (
    <div className="wb-global-toolbar">
      {isShape && (
        <>
          <div className="wb-toolbar-section">
            <div className="wb-toolbar-color-picker" title="Cor de Fundo" style={{ '--current-color': activeNode.bg || def.bg || '#ffffff' }}>
              <Palette size={16} />
              <input type="color" value={activeNode.bg || def.bg || '#ffffff'} onChange={(e) => setNodeStyle('bg', e.target.value)} />
            </div>
          </div>
          <div className="wb-toolbar-divider" />
        </>
      )}

      {(isShape || isDrawing) && (
        <>
          <div className="wb-toolbar-section" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div className="wb-toolbar-color-picker" title={isDrawing ? "Cor do Traço" : "Cor da Borda"} style={{ '--current-color': activeNode.borderColor || def.borderColor || '#3b82f6' }}>
              <Square size={16} />
              <input type="color" value={activeNode.borderColor || def.borderColor || '#3b82f6'} onChange={(e) => setNodeStyle('borderColor', e.target.value)} />
            </div>
            {!isDrawing && (
              <select className="wb-toolbar-select" style={{ paddingLeft: 8, paddingRight: 20 }} value={activeNode.borderStyle || 'solid'} onChange={(e) => setNodeStyle('borderStyle', e.target.value)} title="Estilo da Borda">
                <option value="solid">━ Sólida</option>
                <option value="dashed">┅ Tracejada</option>
                <option value="dotted">… Pontilhada</option>
              </select>
            )}
            <select className="wb-toolbar-select" style={{ paddingLeft: 8, paddingRight: 20 }} value={activeNode.borderWidth !== undefined ? activeNode.borderWidth : (def.borderWidth || 0)} onChange={(e) => setNodeStyle('borderWidth', parseInt(e.target.value))} title={isDrawing ? "Grossura do Traço" : "Grossura da Borda"}>
              {!isDrawing && <option value={0}>0px</option>}
              <option value={2}>2px</option>
              <option value={4}>4px</option>
              <option value={8}>8px</option>
              {isDrawing && <option value={12}>12px</option>}
            </select>
          </div>
          <div className="wb-toolbar-divider" />
        </>
      )}

      {(isShape || isText) && (
        <>
          <button onClick={() => editor && editor.chain().focus().toggleBold().run()} className={`wb-toolbar-btn ${editor?.isActive('bold') ? 'active' : ''}`} disabled={disabled} title="Negrito"><Bold size={16} /></button>
          <button onClick={() => editor && editor.chain().focus().toggleItalic().run()} className={`wb-toolbar-btn ${editor?.isActive('italic') ? 'active' : ''}`} disabled={disabled} title="Itálico"><Italic size={16} /></button>
          <button onClick={() => editor && editor.chain().focus().toggleUnderline().run()} className={`wb-toolbar-btn ${editor?.isActive('underline') ? 'active' : ''}`} disabled={disabled} title="Sublinhado"><UnderlineIcon size={16} /></button>
          <div className="wb-toolbar-divider" />
          <button onClick={() => editor && editor.chain().focus().setTextAlign('left').run()} className={`wb-toolbar-btn ${editor?.isActive({ textAlign: 'left' }) ? 'active' : ''}`} disabled={disabled} title="Alinhar à Esquerda"><AlignLeft size={16} /></button>
          <button onClick={() => editor && editor.chain().focus().setTextAlign('center').run()} className={`wb-toolbar-btn ${editor?.isActive({ textAlign: 'center' }) ? 'active' : ''}`} disabled={disabled} title="Centralizar"><AlignCenter size={16} /></button>
          <div className="wb-toolbar-divider" />
          <button onClick={() => editor && editor.chain().focus().toggleBulletList().run()} className={`wb-toolbar-btn ${editor?.isActive('bulletList') ? 'active' : ''}`} disabled={disabled} title="Lista"><List size={16} /></button>
          <div className="wb-toolbar-divider" />
        </>
      )}

      <button onClick={() => setNodeStyle('isLocked', !activeNode?.isLocked)} className={`wb-toolbar-btn ${activeNode?.isLocked ? 'active' : ''}`} disabled={disabled} title={activeNode?.isLocked ? "Desbloquear" : "Bloquear"}>
        {activeNode?.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
      </button>

      <button onClick={() => duplicateNodes(selectedNodes.map(n => n.id))} className="wb-toolbar-btn" disabled={disabled} title="Duplicar">
        <Copy size={16} />
      </button>

      <button onClick={() => bringToFront(selectedNodes.map(n => n.id))} className="wb-toolbar-btn" disabled={disabled} title="Trazer para Frente">
        <ArrowUpToLine size={16} />
      </button>

      <button onClick={() => sendToBack(selectedNodes.map(n => n.id))} className="wb-toolbar-btn" disabled={disabled} title="Enviar para Trás">
        <ArrowDownToLine size={16} />
      </button>

      <button onClick={onDelete} className="wb-toolbar-btn" style={{ color: 'var(--red-600)' }} title="Deletar"><Trash2 size={16} /></button>
    </div>
  );
};

const getSmoothSvgPath = (points) => {
  if (points.length === 0) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const cpX = (points[i].x + points[i + 1].x) / 2;
    const cpY = (points[i].y + points[i + 1].y) / 2;
    path += ` Q ${points[i].x} ${points[i].y}, ${cpX} ${cpY}`;
  }
  if (points.length > 1) {
    path += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  }
  return path;
};

const getConnectionPath = (fromPos, fromAnchor, toPos, toAnchor, lineType = 'bezier', wp = null) => {
  const fromX = fromPos.x; const fromY = fromPos.y;
  const toX = toPos.x; const toY = toPos.y;

  let angle = 0;
  if (toAnchor === 'top') angle = 90; 
  else if (toAnchor === 'bottom') angle = -90; 
  else if (toAnchor === 'left') angle = 0; 
  else if (toAnchor === 'right') angle = 180; 
  else angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;

  if (lineType === 'straight') {
    if (wp) return { path: `M ${fromX} ${fromY} L ${wp.x} ${wp.y} L ${toX} ${toY}`, angle, midX: wp.x, midY: wp.y };
    return { path: `M ${fromX} ${fromY} L ${toX} ${toY}`, angle, midX: (fromX + toX) / 2, midY: (fromY + toY) / 2 };
  }
  
  if (lineType === 'orthogonal') {
    if (wp) {
       let path = `M ${fromX} ${fromY} L ${wp.x} ${fromY} L ${wp.x} ${toY} L ${toX} ${toY}`;
       return { path, angle, midX: wp.x, midY: wp.y };
    }
    let midX = (fromX + toX) / 2;
    let midY = (fromY + toY) / 2;
    let path = '';
    if (fromAnchor === 'left' || fromAnchor === 'right' || toAnchor === 'left' || toAnchor === 'right') {
      path = `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`;
    } else {
      path = `M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`;
    }
    return { path, angle, midX, midY };
  }

  // bezier
  if (wp) {
     const cx = 2 * wp.x - 0.5 * fromX - 0.5 * toX;
     const cy = 2 * wp.y - 0.5 * fromY - 0.5 * toY;
     return { path: `M ${fromX} ${fromY} Q ${cx} ${cy} ${toX} ${toY}`, angle, midX: wp.x, midY: wp.y };
  }

  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);
  const dist = Math.sqrt(dx * dx + dy * dy);
  const tension = Math.min(Math.max(dist * 0.4, 60), 250);

  const getCP = (x, y, anchor) => {
    switch (anchor) {
      case 'top': return { cx: x, cy: y - tension };
      case 'bottom': return { cx: x, cy: y + tension };
      case 'left': return { cx: x - tension, cy: y };
      case 'right': return { cx: x + tension, cy: y };
      default: return { cx: x, cy: y };
    }
  };

  const cp1 = getCP(fromX, fromY, fromAnchor);
  const cp2 = getCP(toX, toY, toAnchor);
  
  const midX = 0.125 * fromX + 0.375 * cp1.cx + 0.375 * cp2.cx + 0.125 * toX;
  const midY = 0.125 * fromY + 0.375 * cp1.cy + 0.375 * cp2.cy + 0.125 * toY;

  return { path: `M ${fromX} ${fromY} C ${cp1.cx} ${cp1.cy}, ${cp2.cx} ${cp2.cy}, ${toX} ${toY}`, angle, midX, midY };
};

const getRopePath = (fromX, fromY, toX, toY) => {
  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  const sag = Math.min(dist * 0.45, 300) + 20; 
  
  return {
    path: `M ${fromX} ${fromY} Q ${(fromX + toX) / 2} ${Math.max(fromY, toY) + sag} ${toX} ${toY}`,
    angle: 0,
    midX: (fromX + toX) / 2,
    midY: Math.max(fromY, toY) + sag / 2
  };
};

const getNodeSize = (node) => {
  if (!node) return { w: 80, h: 80 };
  const funnelKey = (node.funnelType && FUNNEL_NODES[node.funnelType]) 
    ? node.funnelType 
    : (node.type && FUNNEL_NODES[node.type] ? node.type : null);
  
  if (funnelKey) {
    // Aggressively sanitize any non-square legacy or stretched dimensions
    if (!node.width || !node.height || node.width !== node.height || node.width === 180 || node.width === 160) {
      return { w: 80, h: 80 };
    }
    const size = Math.max(node.width || 80, node.height || 80);
    return { w: size, h: size };
  }
  
  return {
    w: node.width || (node.type === 'text' ? 200 : (node.type === 'post-it' ? 260 : 200)),
    h: node.height || (node.type === 'text' ? 50 : (node.type === 'post-it' ? 120 : 100))
  };
};

const getAnchorPosition = (node, anchor) => {
  const { w, h } = getNodeSize(node);
  const cx = node.x + w / 2;
  const cy = node.y + h / 2;
  switch (anchor) {
    case 'top': return { x: cx, y: node.y };
    case 'bottom': return { x: cx, y: node.y + h };
    case 'left': return { x: node.x, y: cy };
    case 'right': return { x: node.x + w, y: cy };
    default: return { x: cx, y: cy };
  }
};

const getSmartAnchorPosition = (node1, node2) => {
  const { w: w1, h: h1 } = getNodeSize(node1);
  const { w: w2, h: h2 } = getNodeSize(node2);
  
  const c1 = { x: node1.x + w1 / 2, y: node1.y + h1 / 2 };
  const c2 = { x: node2.x + w2 / 2, y: node2.y + h2 / 2 };
  
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  
  let a1 = 'right';
  let a2 = 'left';
  if (Math.abs(dx) > Math.abs(dy)) {
    a1 = dx > 0 ? 'right' : 'left';
    a2 = dx > 0 ? 'left' : 'right';
  } else {
    a1 = dy > 0 ? 'bottom' : 'top';
    a2 = dy > 0 ? 'top' : 'bottom';
  }
  
  const getPos = (node, anchor, w, h, cx, cy) => {
    switch (anchor) {
      case 'top': return { x: cx, y: node.y };
      case 'bottom': return { x: cx, y: node.y + h };
      case 'left': return { x: node.x, y: cy };
      case 'right': return { x: node.x + w, y: cy };
      default: return { x: cx, y: cy };
    }
  };
  
  return {
    fromPos: getPos(node1, a1, w1, h1, c1.x, c1.y),
    toPos: getPos(node2, a2, w2, h2, c2.x, c2.y),
    fromAnchor: a1,
    toAnchor: a2
  };
};

const Connection = ({ conn, nodes, updateConnection, isSelected, onSelect, onWaypointDragStart }) => {
  const [snapped, setSnapped] = useState(!conn.isNew);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (conn.isNew && !snapped) {
      const timer = setTimeout(() => {
        setSnapped(true);
        conn.isNew = false; 
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [conn, snapped]);

  const fromNode = nodes.find(n => n.id === conn.from);
  const toNode = nodes.find(n => n.id === conn.to);
  if (!fromNode || !toNode) return null;

  const { fromPos, toPos, fromAnchor, toAnchor } = getSmartAnchorPosition(fromNode, toNode);

  const { path, angle, midX, midY } = snapped 
    ? getConnectionPath(fromPos, fromAnchor, toPos, toAnchor, conn.lineType || 'bezier', conn.wp)
    : getRopePath(fromPos.x, fromPos.y, toPos.x, toPos.y);

  const strokeColor = conn.color || (isSelected ? '#3b82f6' : '#94a3b8');
  const strokeWidth = conn.strokeWidth || (isSelected ? 3 : 2);
  const strokeType = conn.strokeType || 'solid';
  const dashArray = strokeType === 'dashed' ? '8 8' : (strokeType === 'dotted' ? '4 4' : 'none');

  return (
    <g>
      {/* Invisible Hitbox Shield */}
      <path 
        d={path} 
        fill="none"
        stroke="transparent"
        strokeWidth={25}
        onDoubleClick={() => setIsEditing(true)}
        onPointerDown={(e) => { e.stopPropagation(); onSelect(conn.id, e.shiftKey); }}
        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
      />
      
      {/* Visible Path */}
      <path 
        d={path} 
        className={`wb-connection-path wb-anim-snap ${conn.isAnimated ? 'wb-flow-anim' : ''}`} 
        style={{ 
          pointerEvents: 'none', 
          strokeWidth: strokeWidth, 
          stroke: strokeColor,
          strokeDasharray: dashArray
        }}
      />
      
      {/* End Arrowhead */}
      {conn.arrowType !== 'none' && conn.arrowType !== 'start' && (
        <polygon points="0,-6 12,0 0,6" transform={`translate(${toPos.x}, ${toPos.y}) rotate(${angle})`} fill={strokeColor} className="wb-connection-arrowhead wb-anim-snap" />
      )}
      
      {/* Start Arrowhead (Bidirectional) */}
      {(conn.arrowType === 'both' || conn.arrowType === 'start') && (
        <polygon points="0,-6 12,0 0,6" transform={`translate(${fromPos.x}, ${fromPos.y}) rotate(${angle + 180})`} fill={strokeColor} className="wb-connection-arrowhead wb-anim-snap" />
      )}
      
      {/* Waypoint Handle */}
      {isSelected && !isEditing && (
        <circle 
          cx={midX} 
          cy={midY} 
          r={6} 
          fill="#ffffff" 
          stroke={strokeColor} 
          strokeWidth={3}
          style={{ cursor: 'grab', pointerEvents: 'auto' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onWaypointDragStart(conn.id);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            updateConnection(conn.id, { wp: null }); // Reset waypoint
          }}
          title="Arraste para curvar, clique duplo para resetar"
        />
      )}
      
      {/* Badge Métrica */}
      {conn.badge && !isEditing && (
        <foreignObject x={midX - 40} y={midY - 45} width={80} height={24} style={{ overflow: 'visible', pointerEvents: 'none' }}>
          <div 
            style={{ pointerEvents: 'auto', textAlign: 'center', background: '#22c55e', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', width: 'fit-content', margin: '0 auto', boxShadow: '0 2px 5px rgba(0,0,0,0.15)', cursor: 'pointer' }}
            onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          >
            {conn.badge}
          </div>
        </foreignObject>
      )}

      {/* Free Text Label */}
      {conn.label && !isEditing && (
        <foreignObject x={midX - 75} y={midY - 15} width={150} height={30} style={{ overflow: 'visible', pointerEvents: 'none' }}>
          <div 
            className="wb-connection-label" 
            onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            style={{ pointerEvents: 'auto', textAlign: 'center', background: 'white', padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', color: '#334155', width: 'fit-content', margin: '0 auto', cursor: 'pointer' }}
          >
            {conn.label}
          </div>
        </foreignObject>
      )}

      {isEditing && (
        <foreignObject x={midX - 100} y={midY - 70} width={200} height={120} style={{ overflow: 'visible' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', background: 'white', padding: '8px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>EDITAR CONEXÃO</span>
            <input 
              className="wb-connection-input"
              placeholder="Texto Livre"
              defaultValue={conn.label || ''}
              style={{ width: '100%', textAlign: 'center', fontSize: '12px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}
              onBlur={(e) => {
                 setTimeout(() => setIsEditing(false), 200);
                 updateConnection(conn.id, { label: e.target.value });
              }}
              onKeyDown={(e) => {
                 if (e.key === 'Enter') {
                   updateConnection(conn.id, { label: e.target.value });
                   setIsEditing(false);
                 }
              }}
            />
            <input 
              placeholder="Badge Numérico (Ex: +25%)"
              defaultValue={conn.badge || ''}
              style={{ width: '100%', textAlign: 'center', fontSize: '11px', padding: '4px', borderRadius: '4px', border: '1px solid #22c55e', background: '#f0fdf4', outline: 'none' }}
              onBlur={(e) => {
                 updateConnection(conn.id, { badge: e.target.value });
              }}
              onKeyDown={(e) => {
                 if (e.key === 'Enter') {
                   updateConnection(conn.id, { badge: e.target.value });
                   setIsEditing(false);
                 }
              }}
            />
          </div>
        </foreignObject>
      )}
    </g>
  );
};


const DraggableNode = ({ node, updateNode, updateMultipleNodes, selectedNodeIds, isCameraMoving, isDrafting, onEditorFocus, isActiveNode, cameraZoom, saveHistory, onConnectionStart, user }) => {
  const funnelKey = (node.funnelType && FUNNEL_NODES[node.funnelType]) 
    ? node.funnelType 
    : (node.type && FUNNEL_NODES[node.type] ? node.type : null);
  const isFunnelNode = !!funnelKey;

  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startGroupPositions = useRef({}); 

  const [resizeDir, setResizeDir] = useState(null);
  const startSize = useRef({ w: 0, h: 0, x: 0, y: 0 });

  const isTextMode = node.type === 'text';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      FontSize,
      Mention.configure({
        HTMLAttributes: {
          class: 'mention-tag',
        },
        suggestion: getMentionSuggestion(user),
      }),
    ],
    content: node.text || '<p></p>',
    onFocus: ({ editor }) => {},
    onBlur: ({ editor }) => {
      const currentHtml = editor.getHTML();
      if (currentHtml !== node.text) {
        saveHistory(); 
        updateNode(node.id, { text: currentHtml });
      }
    }
  });

  useEffect(() => {
    if (editor && node.text !== editor.getHTML()) {
      editor.commands.setContent(node.text);
    }
  }, [node.text, editor]);

  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (e.button !== 0 || node.isLocked) return;
    if (e.target.closest('.ProseMirror') && isActiveNode && !e.shiftKey) return; 
    if (e.target.closest('.wb-resize-handle') || e.target.closest('.wb-connection-anchor')) return; 
    
    if (e.shiftKey) {
      onEditorFocus(editor, node.id, true); 
    } else if (!selectedNodeIds.includes(node.id)) {
      onEditorFocus(editor, node.id, false); 
    } else {
      onEditorFocus(editor, node.id, false, true); 
    }

    saveHistory(); 
    setIsDragging(true);
    e.target.setPointerCapture(e.pointerId);
    startPos.current = { x: e.clientX, y: e.clientY };
    
    const currentSelected = (selectedNodeIds.includes(node.id) || e.shiftKey) 
      ? Array.from(new Set([...selectedNodeIds, node.id])) 
      : [node.id];
    startGroupPositions.current = currentSelected;
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = (e.clientX - startPos.current.x) / cameraZoom;
    const dy = (e.clientY - startPos.current.y) / cameraZoom;
    
    updateMultipleNodes(startGroupPositions.current, dx, dy);
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  const handleResizePointerDown = (e, dir) => {
    e.stopPropagation();
    if (e.button !== 0 || node.isLocked) return;
    
    saveHistory(); 
    setResizeDir(dir);
    e.target.setPointerCapture(e.pointerId);
    startPos.current = { x: e.clientX, y: e.clientY };
    const { w, h } = getNodeSize(node);
    startSize.current = { w, h, x: node.x, y: node.y };
  };

  const handleResizePointerMove = (e) => {
    if (!resizeDir) return;
    const dx = (e.clientX - startPos.current.x) / cameraZoom;
    const dy = (e.clientY - startPos.current.y) / cameraZoom;

    let newW = startSize.current.w, newH = startSize.current.h;
    let newX = startSize.current.x, newY = startSize.current.y;

    if (resizeDir.includes('right')) newW += dx;
    if (resizeDir.includes('bottom')) newH += dy;
    if (resizeDir.includes('left')) { newW -= dx; newX += dx; }
    if (resizeDir.includes('top')) { newH -= dy; newY += dy; }

    const minW = isTextMode ? 50 : 100, minH = isTextMode ? 30 : 100;
    if (newW < minW) { if (resizeDir.includes('left')) newX -= (minW - newW); newW = minW; }
    if (newH < minH) { if (resizeDir.includes('top')) newY -= (minH - newH); newH = minH; }

    if (isFunnelNode) {
      // Force aspect ratio to 1:1 square for all funnel nodes and maintain alignment shift
      const size = Math.max(newW, newH);
      if (resizeDir.includes('left')) {
        newX += (newW - size);
      }
      if (resizeDir.includes('top')) {
        newY += (newH - size);
      }
      newW = size;
      newH = size;
    }

    updateNode(node.id, { width: newW, height: newH, x: newX, y: newY });
  };

  const handleResizePointerUp = (e) => {
    if (resizeDir) {
      setResizeDir(null);
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  const handleConnectionPointerDown = (e, anchor) => {
    e.stopPropagation();
    e.preventDefault(); 
    onConnectionStart(node.id, anchor, e.clientX, e.clientY);
  };

  // Declared at the top of DraggableNode component

  const typeClass = `wb-node--${node.type || 'post-it'}`;
  const activeClass = isActiveNode ? 'wb-node--active' : '';
  const noPointerClass = isCameraMoving ? 'wb-node--no-pointer' : '';
  const draftingClass = isDrafting ? 'wb-node--drafting' : '';

  const def = {
    'post-it': { bg: '#FFF3B0' },
    'rounded-rect': { bg: '#ebf8ff', borderColor: '#3182ce', borderWidth: 2 },
    'circle': { bg: '#ebf8ff', borderColor: '#3182ce', borderWidth: 2 },
    'diamond': { bg: '#ebf8ff', borderColor: '#3182ce', borderWidth: 2 }
  }[node.type || 'post-it'] || {};

  const { w: renderWidth, h: renderHeight } = getNodeSize(node);

  return (
    <div
      className={`wb-node ${typeClass} ${activeClass} ${noPointerClass} ${draftingClass}`}
      style={{ transform: `translate(${node.x}px, ${node.y}px)`, width: renderWidth, height: renderHeight }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      data-id={node.id}
    >
      {node.type === 'drawing' ? (
        <svg width="100%" height="100%" viewBox={`0 0 ${node.width} ${node.height}`} preserveAspectRatio="none" style={{ overflow: 'visible', position: 'absolute', top: 0, left: 0 }}>
          <path d={node.pathData} fill="none" stroke={node.borderColor || '#ef4444'} strokeWidth={node.borderWidth || 4} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      ) : isFunnelNode ? (
        /* Funnelytics-style illustration directly */
        <div className="wb-funnel-illustration" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {FUNNEL_NODES[funnelKey].icon(renderWidth)}
        </div>
      ) : (
        <div className="wb-node-shape-bg" style={{
          backgroundColor: node.bg || def.bg || 'transparent',
          borderColor: node.borderColor || def.borderColor || 'transparent',
          borderStyle: node.borderStyle || def.borderStyle || 'solid',
          borderWidth: node.borderWidth !== undefined ? `${node.borderWidth}px` : (def.borderWidth ? `${def.borderWidth}px` : '0px'),
        }} />
      )}
      {isTextMode && <div className="wb-node-text-handle" />}
      
      {node.type === 'comment' && (
        <div className="wb-comment-header">
          <span className="wb-comment-author">{node.author || 'Andre'}</span>
          <span className="wb-comment-date">{new Date(node.createdAt || Date.now()).toLocaleDateString()}</span>
        </div>
      )}

      {node.type !== 'drawing' && !isFunnelNode && (
        <EditorContent editor={editor} className="wb-node-editor" />
      )}

      {isFunnelNode && (
        <div className="wb-funnel-label-container" onPointerDown={(e) => e.stopPropagation()}>
          <EditorContent editor={editor} className="wb-node-editor funnel-label-editor" />
        </div>
      )}

      {/* Anchors de Conexão (Só mostra se não estiver trancado e não for texto) */}
      {!node.isLocked && node.type !== 'text' && (
        <>
          <div className="wb-connection-anchor wb-anchor-top" data-anchor="top" onPointerDown={(e) => handleConnectionPointerDown(e, 'top')} title="Puxar seta para cima" />
          <div className="wb-connection-anchor wb-anchor-right" data-anchor="right" onPointerDown={(e) => handleConnectionPointerDown(e, 'right')} title="Puxar seta para a direita" />
          <div className="wb-connection-anchor wb-anchor-bottom" data-anchor="bottom" onPointerDown={(e) => handleConnectionPointerDown(e, 'bottom')} title="Puxar seta para baixo" />
          <div className="wb-connection-anchor wb-anchor-left" data-anchor="left" onPointerDown={(e) => handleConnectionPointerDown(e, 'left')} title="Puxar seta para a esquerda" />
        </>
      )}

      {/* Resize Handles */}
      {isActiveNode && !node.isLocked && node.type !== 'drawing' && (
        <div className="wb-resize-handles">
          {['top-left', 'top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left'].map(dir => (
            <div key={dir} className={`wb-resize-handle wb-resize-${dir}`} onPointerDown={(e) => handleResizePointerDown(e, dir)} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function Whiteboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [loading, setLoading] = useState(true);
  
  const [interactionMode, setInteractionMode] = useState('select');
  const [isPanning, setIsPanning] = useState(false);
  const startInteraction = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const [isSpaceDown, setIsSpaceDown] = useState(false);

  const [activeEditor, setActiveEditor] = useState(null); 
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [selectedConnectionIds, setSelectedConnectionIds] = useState([]);
  const [draggedWaypointId, setDraggedWaypointId] = useState(null);
  const [lassoRect, setLassoRect] = useState(null); 
  const [currentDrawPath, setCurrentDrawPath] = useState(null);
  const [penSettings, setPenSettings] = useState({ color: '#ef4444', width: 4 });
  const [paletteSearch, setPaletteSearch] = useState('');

  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const saveHistory = useCallback((currentNodes = nodes, currentConns = connections) => {
    setPast(prev => [...prev, { nodes: currentNodes, conns: currentConns }].slice(-50));
    setFuture([]);
  }, [nodes, connections]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    setFuture([{ nodes, conns: connections }, ...future]);
    setPast(newPast);
    setNodes(previous.nodes);
    setConnections(previous.conns);
  }, [past, future, nodes, connections]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    setPast([...past, { nodes, conns: connections }]);
    setFuture(newFuture);
    setNodes(next.nodes);
    setConnections(next.conns);
  }, [past, future, nodes, connections]);

  // --- Carregamento e Auto-Save Supabase ---
  useEffect(() => {
    if (!id) return;
    const loadBoard = async () => {
      const { data, error } = await supabase.from('whiteboards').select('*').eq('id', id).single();
      if (error || !data) {
        console.error(error);
        navigate('/whiteboard');
      } else {
        if (data.data) {
          setNodes(data.data.nodes || []);
          setConnections(data.data.connections || []);
        }
      }
      setLoading(false);
    };
    loadBoard();
  }, [id, navigate]);

  useEffect(() => {
    if (loading || !id) return;
    const timer = setTimeout(async () => {
      await supabase.from('whiteboards').update({ 
        data: { nodes, connections },
        updated_at: new Date().toISOString()
      }).eq('id', id);
    }, 1500);
    return () => clearTimeout(timer);
  }, [nodes, connections, id, loading]);



  // --- Atalhos de Teclado (Ctrl+C / Ctrl+V) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.closest('.ProseMirror') || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Ctrl+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedNodeIds.length > 0) {
          const copied = nodes.filter(n => selectedNodeIds.includes(n.id));
          navigator.clipboard.writeText(JSON.stringify({ type: 'wb-nodes', data: copied }));
        }
      }
      
      // Ctrl+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        navigator.clipboard.readText().then(text => {
          try {
            const parsed = JSON.parse(text);
            if (parsed.type === 'wb-nodes') {
              saveHistory(nodes, connections);
              const newNodes = parsed.data.map(n => ({
                ...n,
                id: crypto.randomUUID(),
                x: n.x + 40,
                y: n.y + 40
              }));
              setNodes(prev => [...prev, ...newNodes]);
              setSelectedNodeIds(newNodes.map(n => n.id));
            }
          } catch(err) {}
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, selectedNodeIds, saveHistory, connections]);

  // --- Lógica Rastro da Seta (Gravidade) ---
  const bringToFront = useCallback((ids) => {
    saveHistory(nodes, connections);
    setNodes(prev => {
      const newNodes = [...prev];
      for (let i = newNodes.length - 2; i >= 0; i--) {
        if (ids.includes(newNodes[i].id) && !ids.includes(newNodes[i + 1].id)) {
          const temp = newNodes[i];
          newNodes[i] = newNodes[i + 1];
          newNodes[i + 1] = temp;
        }
      }
      return newNodes;
    });
  }, [nodes, connections, saveHistory]);

  const sendToBack = useCallback((ids) => {
    saveHistory(nodes, connections);
    setNodes(prev => {
      const newNodes = [...prev];
      for (let i = 1; i < newNodes.length; i++) {
        if (ids.includes(newNodes[i].id) && !ids.includes(newNodes[i - 1].id)) {
          const temp = newNodes[i];
          newNodes[i] = newNodes[i - 1];
          newNodes[i - 1] = temp;
        }
      }
      return newNodes;
    });
  }, [nodes, connections, saveHistory]);

  const duplicateNodes = useCallback((ids) => {
    saveHistory(nodes, connections);
    setNodes(prev => {
      const selectedToDuplicate = prev.filter(n => ids.includes(n.id));
      const newNodes = selectedToDuplicate.map(node => ({
        ...node,
        id: crypto.randomUUID(),
        x: node.x + 20,
        y: node.y + 20
      }));
      return [...prev, ...newNodes];
    });
  }, [nodes, connections, saveHistory]);

  const [draftConnection, setDraftConnection] = useState(null); 
  const [draggedShape, setDraggedShape] = useState(null);
  const draggedShapeRef = useRef(null);
  draggedShapeRef.current = draggedShape; 

  const updateNode = useCallback((id, newProps) => {
    setNodes((prev) => prev.map(n => n.id === id ? { ...n, ...newProps } : n));
  }, []);

  const updateMultipleNodes = useCallback((idsToMove, dx, dy) => {
    setNodes(prev => prev.map(n => {
      if (idsToMove.includes(n.id)) {
        return { ...n, x: n.x + dx, y: n.y + dy };
      }
      return n;
    }));
  }, []);

  const updateConnection = useCallback((id, newProps) => {
    saveHistory();
    setConnections(prev => prev.map(c => c.id === id ? { ...c, ...newProps } : c));
  }, [saveHistory]);

  const handleEditorFocus = useCallback((editor, id, isShift, keepGroup = false) => {
    setActiveEditor(editor);
    if (isShift) {
      setSelectedNodeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    } else if (!keepGroup) {
      setSelectedNodeIds([id]);
      setSelectedConnectionIds([]);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !document.activeElement.closest('.ProseMirror')) {
        setIsSpaceDown(true);
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        if (document.activeElement === document.body || document.activeElement === canvasRef.current) { e.preventDefault(); undo(); }
      }
      if (((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') || ((e.metaKey || e.ctrlKey) && e.key === 'y')) {
        if (document.activeElement === document.body || document.activeElement === canvasRef.current) { e.preventDefault(); redo(); }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!document.activeElement.closest('.ProseMirror') && selectedNodeIds.length > 0) { e.preventDefault(); deleteSelectedNodes(); }
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') setIsSpaceDown(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [undo, redo, selectedNodeIds, selectedConnectionIds, nodes, connections]);

  const deleteSelectedNodes = useCallback(() => {
    if (selectedNodeIds.length === 0 && selectedConnectionIds.length === 0) return;
    saveHistory(nodes, connections);
    setNodes(prev => prev.filter(n => !selectedNodeIds.includes(n.id)));
    setConnections(prev => prev.filter(c => !selectedNodeIds.includes(c.from) && !selectedNodeIds.includes(c.to) && !selectedConnectionIds.includes(c.id)));
    setSelectedNodeIds([]);
    setSelectedConnectionIds([]);
    setActiveEditor(null);
  }, [selectedNodeIds, selectedConnectionIds, nodes, connections, saveHistory]);

  const handleConnectionSelect = useCallback((id, isShift) => {
    if (isShift) {
      setSelectedConnectionIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    } else {
      setSelectedConnectionIds([id]);
      setSelectedNodeIds([]);
    }
  }, []);

  const handleWaypointDragStart = useCallback((id) => {
    setInteractionMode('drag_waypoint');
    setDraggedWaypointId(id);
    saveHistory(nodes, connections); // save before drag
  }, [nodes, connections, saveHistory]);

  const canvasRef = useRef(null);

  const handlePointerDown = (e) => {
    if (interactionMode === 'pan' || e.button === 1 || isSpaceDown) {
      setIsPanning(true);
      startPos.current = { x: e.clientX, y: e.clientY };
    } 
    else if (e.button === 0 && interactionMode !== 'pan') {
      if (interactionMode === 'drawing') {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - camera.x) / camera.zoom;
        const y = (e.clientY - rect.top - camera.y) / camera.zoom;
        setCurrentDrawPath([{ x, y }]);
      } else {
        setInteractionMode('select');
        if (!e.shiftKey) {
            setSelectedNodeIds([]); 
            setSelectedConnectionIds([]);
        }
        setActiveEditor(null);
        
        const rect = canvasRef.current.getBoundingClientRect();
        const xInside = e.clientX - rect.left;
        const yInside = e.clientY - rect.top;
        
        setLassoRect({ 
          startX: (xInside - camera.x) / camera.zoom, 
          startY: (yInside - camera.y) / camera.zoom,
          x: (xInside - camera.x) / camera.zoom,
          y: (yInside - camera.y) / camera.zoom,
          w: 0, h: 0 
        });
      }
    }
    e.target.setPointerCapture(e.pointerId);
    startInteraction.current = { x: e.clientX, y: e.clientY };
  };

  const draftRef = useRef(null);

  const handleConnectionStart = useCallback((fromId, fromAnchor, clientX, clientY) => {
    draftRef.current = { fromId, fromAnchor, mouseX: clientX, mouseY: clientY };
    setDraftConnection(draftRef.current);

    const onMove = (e) => {
      draftRef.current = { ...draftRef.current, mouseX: e.clientX, mouseY: e.clientY };
      setDraftConnection(draftRef.current);
    };

    const onUp = (e) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      
      const draft = draftRef.current;
      if (draft) {
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        const targetAnchorEl = elements.find(el => el.classList.contains('wb-connection-anchor'));
        const targetNodeEl = elements.find(el => el.classList.contains('wb-node'));
        
        if (targetNodeEl) {
          const toId = targetNodeEl.getAttribute('data-id');
          if (toId && toId !== draft.fromId) {
            
            let toAnchor = 'center';
            if (targetAnchorEl) {
              toAnchor = targetAnchorEl.getAttribute('data-anchor');
            } else {
              const nodeRect = targetNodeEl.getBoundingClientRect();
              const cx = nodeRect.left + nodeRect.width / 2;
              const cy = nodeRect.top + nodeRect.height / 2;
              const dx = e.clientX - cx;
              const dy = e.clientY - cy;
              
              if (Math.abs(dx) > Math.abs(dy)) {
                toAnchor = dx > 0 ? 'right' : 'left';
              } else {
                toAnchor = dy > 0 ? 'bottom' : 'top';
              }
            }

            setConnections(prev => {
              saveHistory(nodes, prev);
              return [...prev, { id: Date.now().toString(), from: draft.fromId, fromAnchor: draft.fromAnchor, to: toId, toAnchor, isNew: true }];
            });
          }
        }
      }
      draftRef.current = null;
      setDraftConnection(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [nodes, saveHistory]);
  
  const handleContainerPointerMove = (e) => {
    if (isPanning) {
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      startPos.current = { x: e.clientX, y: e.clientY };
      setCamera(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      return;
    }
    
    if (interactionMode === 'drawing' && currentDrawPath) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - camera.x) / camera.zoom;
      const y = (e.clientY - rect.top - camera.y) / camera.zoom;
      setCurrentDrawPath(prev => [...prev, { x, y }]);
    }
    else if (interactionMode === 'drag_waypoint' && draggedWaypointId) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - camera.x) / camera.zoom;
      const y = (e.clientY - rect.top - camera.y) / camera.zoom;
      updateConnection(draggedWaypointId, { wp: { x, y } });
    }
    else if (lassoRect && interactionMode === 'select') {
      const rect = canvasRef.current.getBoundingClientRect();
      const xInside = e.clientX - rect.left;
      const yInside = e.clientY - rect.top;
      const currentX = (xInside - camera.x) / camera.zoom;
      const currentY = (yInside - camera.y) / camera.zoom;
      
      const newLasso = {
        ...lassoRect,
        x: Math.min(lassoRect.startX, currentX),
        y: Math.min(lassoRect.startY, currentY),
        w: Math.abs(currentX - lassoRect.startX),
        h: Math.abs(currentY - lassoRect.startY)
      };
      setLassoRect(newLasso);

      const newSelectedIds = nodes.filter(n => {
        const { w, h } = getNodeSize(n);
        return (
          n.x < newLasso.x + newLasso.w &&
          n.x + w > newLasso.x &&
          n.y < newLasso.y + newLasso.h &&
          n.y + h > newLasso.y
        );
      }).map(n => n.id);
      
      setSelectedNodeIds(prev => Array.from(new Set([...prev, ...newSelectedIds])));
    }
  };

  const handleContainerPointerUp = (e) => {
    if (isPanning) {
      setIsPanning(false);
      if (e.target.hasPointerCapture && e.target.hasPointerCapture(e.pointerId)) e.target.releasePointerCapture(e.pointerId);
      return;
    }

    if (interactionMode === 'drag_waypoint') {
      setInteractionMode('select');
      setDraggedWaypointId(null);
      return;
    }

    if (interactionMode === 'drawing' && currentDrawPath) {
      if (currentDrawPath.length > 2) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        currentDrawPath.forEach(p => {
          minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        });
        
        const normalizedPoints = currentDrawPath.map(p => ({ x: p.x - minX, y: p.y - minY }));
        const svgPath = getSmoothSvgPath(normalizedPoints);
        
        saveHistory();
        const newNode = {
          id: Date.now().toString(),
          type: 'drawing',
          x: minX, y: minY,
          width: Math.max(maxX - minX, 10),
          height: Math.max(maxY - minY, 10),
          pathData: svgPath,
          borderColor: penSettings.color,
          borderWidth: penSettings.width
        };
        setNodes(prev => [...prev, newNode]);
      }
      setCurrentDrawPath(null);
      if (e.target.hasPointerCapture && e.target.hasPointerCapture(e.pointerId)) e.target.releasePointerCapture(e.pointerId);
      return;
    }
    
    if (lassoRect) {
      setLassoRect(null);
      if (e.target.hasPointerCapture && e.target.hasPointerCapture(e.pointerId)) e.target.releasePointerCapture(e.pointerId);
    }
  };

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (e.ctrlKey || e.metaKey) {
      const zoomSensitivity = 0.005;
      const delta = -e.deltaY * zoomSensitivity;
      setCamera((prev) => {
        let newZoom = prev.zoom + delta;
        newZoom = Math.max(0.1, Math.min(newZoom, 5));

        // Point under mouse in canvas coordinates before zoom
        const cx = (mouseX - prev.x) / prev.zoom;
        const cy = (mouseY - prev.y) / prev.zoom;

        // New camera position coordinates after zoom
        const newX = mouseX - cx * newZoom;
        const newY = mouseY - cy * newZoom;

        return { x: newX, y: newY, zoom: newZoom };
      });
    } else {
      setCamera((prev) => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel, loading]);

  const addNodeAtPosition = useCallback((type, clientX, clientY) => {
    saveHistory();
    const defaultSizes = { 
      'text': { w: 200, h: 50 }, 'post-it': { w: 260, h: 120 }, 'rounded-rect': { w: 200, h: 100 }, 'circle': { w: 160, h: 160 }, 'diamond': { w: 180, h: 180 }, 'comment': { w: 240, h: 80 },
      'page-optin': { w: 80, h: 80 }, 'page-sales': { w: 80, h: 80 }, 'page-vsl': { w: 80, h: 80 }, 'page-checkout': { w: 80, h: 80 }, 'page-thankyou': { w: 80, h: 80 },
      'action-purchase': { w: 80, h: 80 }, 'action-lead': { w: 80, h: 80 }
    };
    // Traffic sources get their size from FUNNEL_NODES
    Object.keys(FUNNEL_NODES).forEach(key => { defaultSizes[key] = { w: 80, h: 80 }; });
    const size = defaultSizes[type] || { w: 200, h: 100 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const xInsideCanvas = clientX - rect.left;
    const yInsideCanvas = clientY - rect.top;

    const worldX = (xInsideCanvas - camera.x) / camera.zoom - size.w / 2;
    const worldY = (yInsideCanvas - camera.y) / camera.zoom - size.h / 2;

    const titles = {
      'page-optin': 'Opt-in Page', 'page-sales': 'Página de Vendas', 'page-vsl': 'VSL', 'page-checkout': 'Checkout', 'page-thankyou': 'Thank You',
      'action-purchase': 'Compra', 'action-lead': 'Lead'
    };
    // Add all FUNNEL_NODES labels
    Object.entries(FUNNEL_NODES).forEach(([key, v]) => { titles[key] = v.label; });
    
    const colors = {
      'traffic': { bg: '#ffffff', border: '#e2e8f0' },
      'page': { bg: '#dcfce7', border: '#22c55e' },
      'action': { bg: '#ffedd5', border: '#f97316' }
    };

    let textHTML = '<p style="text-align: center"></p>';
    let bg = undefined;
    let borderColor = undefined;
    let borderWidth = undefined;
    let nodeType = type;

    if (type.startsWith('traffic-') || type.startsWith('page-') || type.startsWith('action-')) {
      const category = type.split('-')[0];
      textHTML = `<p style="text-align: center"><strong>${titles[type]}</strong></p>`;
      bg = colors[category].bg;
      borderColor = colors[category].border;
      borderWidth = 2;
      nodeType = 'rounded-rect';
    }

    const newNode = {
      id: Date.now().toString(),
      type: nodeType,
      funnelType: type !== nodeType ? type : undefined,
      x: worldX, y: worldY,
      width: size.w, height: size.h,
      text: textHTML,
      bg, borderColor, borderWidth,
      author: user || 'André',
      createdAt: new Date().toISOString()
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeIds([newNode.id]);
  }, [camera, saveHistory, setNodes, setSelectedNodeIds, user]);

  // --- Drag Shape from Palette Effect ---
  useEffect(() => {
    if (!draggedShape) return;
    
    const onMove = (e) => {
      setDraggedShape(prev => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null);
    };
    
    const onUp = (e) => {
      const currentDrag = draggedShapeRef.current;
      if (currentDrag) {
        addNodeAtPosition(currentDrag.type, e.clientX, e.clientY);
        setDraggedShape(null);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [draggedShape, addNodeAtPosition]);

  const handleExport = () => {
    if (canvasRef.current) {
      toPng(canvasRef.current, { backgroundColor: '#f8fafc' }).then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'crm-dna-whiteboard.png';
        link.href = dataUrl;
        link.click();
      }).catch(err => {
        console.error('Erro na exportação:', err);
        alert('Erro ao exportar a imagem. Tente reduzir o zoom ou o número de elementos visíveis.');
      });
    }
  };

  const renderDraftConnection = () => {
    if (!draftConnection) return null;
    const fromNode = nodes.find(n => n.id === draftConnection.fromId);
    if (!fromNode) return null;

    const fromPos = getAnchorPosition(fromNode, draftConnection.fromAnchor);
    
    const rect = canvasRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const toX = (draftConnection.mouseX - rect.left - camera.x) / camera.zoom;
    const toY = (draftConnection.mouseY - rect.top - camera.y) / camera.zoom;

    const { path, angle } = getRopePath(fromPos.x, fromPos.y, toX, toY);

    return (
      <g>
        <path d={path} className="wb-connection-path draft" />
        <polygon points="0,-8 16,0 0,8" transform={`translate(${toX}, ${toY}) rotate(${angle})`} fill="#60a5fa" className="wb-connection-arrowhead draft" />
      </g>
    );
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Carregando Quadro...</div>;

  return (
    <div 
      className={`whiteboard-container ${isSpaceDown ? 'whiteboard-container--space' : ''}`}
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handleContainerPointerUp}
    >
      <div className="whiteboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'auto' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/whiteboard')} title="Voltar aos Projetos">
            <ChevronLeft size={16} />
          </button>
          <h2>Canvas</h2>
        </div>
        
        {(selectedNodeIds.length > 0 || selectedConnectionIds.length > 0) && interactionMode !== 'drawing' && (
          <GlobalToolbar 
            editor={activeEditor} 
            selectedNodes={nodes.filter(n => selectedNodeIds.includes(n.id))} 
            selectedConnections={connections.filter(c => selectedConnectionIds.includes(c.id))}
            updateNode={updateNode} 
            updateConnection={updateConnection}
            onDelete={deleteSelectedNodes}
            interactionMode={interactionMode}
            penSettings={penSettings}
            setPenSettings={setPenSettings}
            bringToFront={bringToFront}
            sendToBack={sendToBack}
            duplicateNodes={duplicateNodes}
          />
        )}
        
        {interactionMode === 'drawing' && (
          <GlobalToolbar 
            editor={null} 
            selectedNodes={[]} 
            updateNode={() => {}} 
            onDelete={() => {}} 
            interactionMode={interactionMode}
            penSettings={penSettings}
            setPenSettings={setPenSettings}
          />
        )}

        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
          <button onClick={undo} className="btn btn-secondary btn-sm" disabled={past.length === 0} title="Desfazer"><Undo size={16} /></button>
          <button onClick={redo} className="btn btn-secondary btn-sm" disabled={future.length === 0} title="Refazer"><Redo size={16} /></button>
        </div>
        <div className="whiteboard-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleExport} title="Baixar Imagem PNG"><Download size={16} /> Exportar</button>
        </div>
      </div>

      <div className="wb-left-palette">
        <div className="wb-palette-search-container" style={{ pointerEvents: 'auto' }}>
          <span className="wb-palette-search-icon"><Search size={14} /></span>
          <input 
            type="text" 
            placeholder="Pesquisar elementos..." 
            className="wb-palette-search" 
            value={paletteSearch}
            onChange={(e) => setPaletteSearch(e.target.value)}
          />
        </div>
        <div className="wb-palette-divider" />

        {/* Básico Group */}
        {(() => {
          const basicItems = [
            { type: 'text', label: 'Texto', icon: <Type size={18} color="#64748b" />, desc: 'Texto Solto' },
            { type: 'post-it', label: 'Post-it', icon: <StickyNote size={18} color="#ca8a04" />, style: { background: '#FFF3B0' }, desc: 'Nota (Post-it)' },
            { type: 'comment', label: 'Comentário', icon: <MessageSquare size={18} color="#64748b" />, desc: 'Comentário' },
            { type: 'rounded-rect', label: 'Retângulo', icon: <Square size={18} color="#3182ce" />, desc: 'Retângulo' },
            { type: 'circle', label: 'Círculo', icon: <Circle size={18} color="#3182ce" />, desc: 'Círculo' },
            { type: 'diamond', label: 'Losango', icon: <Diamond size={18} color="#3182ce" />, desc: 'Losango (Decisão)' }
          ].filter(item => item.label.toLowerCase().includes(paletteSearch.toLowerCase().trim()));

          if (basicItems.length === 0) return null;
          return (
            <details className="wb-palette-group" open>
              <summary className="wb-palette-title">Básico</summary>
              <div className="wb-palette-items wb-palette-items--traffic">
                {basicItems.map(item => (
                  <button 
                    key={item.type}
                    className="wb-traffic-palette-btn" 
                    onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: item.type, mouseX: e.clientX, mouseY: e.clientY }); }} 
                    title={item.desc}
                  >
                    <span className="wb-traffic-palette-icon" style={item.style}>{item.icon}</span>
                    <span className="wb-traffic-palette-label">{item.label}</span>
                  </button>
                ))}
              </div>
            </details>
          );
        })()}

        {/* Tráfego Group */}
        {(() => {
          const filteredTraffic = TRAFFIC_PALETTE_ITEMS.filter(item => 
            item.label.toLowerCase().includes(paletteSearch.toLowerCase().trim())
          );

          if (filteredTraffic.length === 0) return null;
          return (
            <details className="wb-palette-group" open>
              <summary className="wb-palette-title">Tráfego</summary>
              <div className="wb-palette-items wb-palette-items--traffic">
                {filteredTraffic.map(item => (
                  <button
                    key={item.type}
                    className="wb-traffic-palette-btn"
                    onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: item.type, mouseX: e.clientX, mouseY: e.clientY }); }}
                    title={item.label}
                  >
                    <span className="wb-traffic-palette-icon" style={{ '--brand': item.brandColor }}>
                      {item.icon(18)}
                    </span>
                    <span className="wb-traffic-palette-label">{item.label}</span>
                  </button>
                ))}
              </div>
            </details>
          );
        })()}

        {/* Páginas Group */}
        {(() => {
          const pageItems = [
            { type: 'page-optin', label: 'Landing Page', icon: <LayoutTemplate size={18} color="#16a34a" />, style: { background: '#dcfce7' }, desc: 'Opt-in / Landing Page' },
            { type: 'page-sales', label: 'Pág. de Vendas', icon: <ShoppingBag size={18} color="#16a34a" />, style: { background: '#dcfce7' }, desc: 'Página de Vendas' },
            { type: 'page-vsl', label: 'VSL', icon: <Video size={18} color="#16a34a" />, style: { background: '#dcfce7' }, desc: 'VSL' },
            { type: 'page-checkout', label: 'Checkout', icon: <CreditCard size={18} color="#16a34a" />, style: { background: '#dcfce7' }, desc: 'Checkout' },
            { type: 'page-thankyou', label: 'Thank You', icon: <CheckCircle size={18} color="#16a34a" />, style: { background: '#dcfce7' }, desc: 'Thank You Page' }
          ].filter(item => item.label.toLowerCase().includes(paletteSearch.toLowerCase().trim()));

          if (pageItems.length === 0) return null;
          return (
            <details className="wb-palette-group" open>
              <summary className="wb-palette-title">Páginas</summary>
              <div className="wb-palette-items wb-palette-items--traffic">
                {pageItems.map(item => (
                  <button 
                    key={item.type}
                    className="wb-traffic-palette-btn" 
                    onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: item.type, mouseX: e.clientX, mouseY: e.clientY }); }} 
                    title={item.desc}
                  >
                    <span className="wb-traffic-palette-icon" style={item.style}>{item.icon}</span>
                    <span className="wb-traffic-palette-label">{item.label}</span>
                  </button>
                ))}
              </div>
            </details>
          );
        })()}

        {/* Ações Group */}
        {(() => {
          const actionItems = [
            { type: 'action-purchase', label: 'Compra', icon: <BadgeDollarSign size={18} color="#ea580c" />, style: { background: '#ffedd5' }, desc: 'Compra' },
            { type: 'action-lead', label: 'Lead', icon: <UserPlus size={18} color="#ea580c" />, style: { background: '#ffedd5' }, desc: 'Lead' }
          ].filter(item => item.label.toLowerCase().includes(paletteSearch.toLowerCase().trim()));

          if (actionItems.length === 0) return null;
          return (
            <details className="wb-palette-group" open>
              <summary className="wb-palette-title">Ações</summary>
              <div className="wb-palette-items wb-palette-items--traffic">
                {actionItems.map(item => (
                  <button 
                    key={item.type}
                    className="wb-traffic-palette-btn" 
                    onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: item.type, mouseX: e.clientX, mouseY: e.clientY }); }} 
                    title={item.desc}
                  >
                    <span className="wb-traffic-palette-icon" style={item.style}>{item.icon}</span>
                    <span className="wb-traffic-palette-label">{item.label}</span>
                  </button>
                ))}
              </div>
            </details>
          );
        })()}
      </div>

      {/* Toolbar Inferior de Ferramentas de Interação */}
      <div className="wb-bottom-toolbar">
        <button 
          onClick={() => setInteractionMode('select')} 
          className={`wb-bottom-btn ${interactionMode === 'select' ? 'active' : ''}`} 
          title="Selecionar / Mover (V)"
        >
          <MousePointer2 size={18} />
        </button>
        <button 
          onClick={() => setInteractionMode('pan')} 
          className={`wb-bottom-btn ${interactionMode === 'pan' ? 'active' : ''}`} 
          title="Navegar pelo Canvas (Espaço + Arrastar)"
        >
          <Hand size={18} />
        </button>
        <div className="wb-bottom-divider" />
        <button 
          onClick={() => setInteractionMode('drawing')} 
          className={`wb-bottom-btn ${interactionMode === 'drawing' ? 'active' : ''}`} 
          title="Pincel / Desenho Livre (P)"
        >
          <PenTool size={18} />
        </button>
      </div>

      <div 
        className={`whiteboard-canvas ${interactionMode === 'panning' ? 'whiteboard-canvas--panning' : ''}`}
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onContextMenu={(e) => e.preventDefault()}
        tabIndex={0} 
        style={{ '--pan-x': camera.x, '--pan-y': camera.y, '--zoom': camera.zoom }}
      >
        <div 
          className="whiteboard-layer"
          style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`, transformOrigin: '0 0' }}
        >
          <svg className="wb-connections-svg" style={{ overflow: 'visible', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
            {connections.map(conn => <Connection key={conn.id} conn={conn} nodes={nodes} updateConnection={updateConnection} isSelected={selectedConnectionIds.includes(conn.id)} onSelect={handleConnectionSelect} onWaypointDragStart={handleWaypointDragStart} />)}
            {renderDraftConnection()}
            {currentDrawPath && (
              <path d={getSmoothSvgPath(currentDrawPath)} fill="none" stroke={penSettings.color} strokeWidth={penSettings.width} strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>

          {nodes.map(node => (
            <DraggableNode 
              key={node.id} 
              node={node} 
              updateNode={updateNode} 
              updateMultipleNodes={updateMultipleNodes}
              selectedNodeIds={selectedNodeIds}
              isCameraMoving={interactionMode === 'panning' || !!draggedShape} 
              isDrafting={draftConnection?.fromId === node.id}
              cameraZoom={camera.zoom}
              onEditorFocus={handleEditorFocus}
              isActiveNode={selectedNodeIds.includes(node.id)} 
              saveHistory={() => saveHistory(nodes, connections)}
              onConnectionStart={handleConnectionStart}
              user={user}
            />
          ))}

            {lassoRect && (
              <div 
                className="wb-lasso-rect" 
                style={{
                  left: lassoRect.x, top: lassoRect.y,
                  width: lassoRect.w, height: lassoRect.h
                }} 
              />
            )}
          </div>
        </div>



      {draggedShape && (
        <div 
          className={`wb-node wb-node--${draggedShape.type} wb-drag-ghost`}
          style={{
            position: 'fixed',
            pointerEvents: 'none',
            left: draggedShape.mouseX,
            top: draggedShape.mouseY,
            transform: 'translate(-50%, -50%)',
            width: draggedShape.type === 'text' ? 200 : 160,
            height: draggedShape.type === 'text' ? 50 : 100,
            opacity: 0.7,
            zIndex: 9999
          }}
        >
          <div className="wb-node-shape-bg" />
        </div>
      )}
    </div>
  );
}
