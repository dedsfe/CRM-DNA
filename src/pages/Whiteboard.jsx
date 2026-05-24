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
    icon: (size = 24) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  'traffic-instagram': {
    label: 'Instagram',
    category: 'traffic',
    brandColor: '#E4405F',
    icon: (size = 24) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#E4405F">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
  },
  'traffic-google': {
    label: 'Google Ads',
    category: 'traffic',
    brandColor: '#4285F4',
    icon: (size = 24) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  'traffic-youtube': {
    label: 'YouTube',
    category: 'traffic',
    brandColor: '#FF0000',
    icon: (size = 24) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF0000">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  'traffic-tiktok': {
    label: 'TikTok',
    category: 'traffic',
    brandColor: '#000000',
    icon: (size = 24) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#000000">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
  },
  'traffic-email': {
    label: 'E-mail',
    category: 'traffic',
    brandColor: '#6366F1',
    icon: (size = 24) => <Mail size={size} color="#6366F1" strokeWidth={2} />,
  },
  'traffic-whatsapp': {
    label: 'WhatsApp',
    category: 'traffic',
    brandColor: '#25D366',
    icon: (size = 24) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
  'traffic-organic': {
    label: 'Orgânico (SEO)',
    category: 'traffic',
    brandColor: '#16A34A',
    icon: (size = 24) => <Globe size={size} color="#16A34A" strokeWidth={2} />,
  },
  'traffic-linkedin': {
    label: 'LinkedIn',
    category: 'traffic',
    brandColor: '#0A66C2',
    icon: (size = 24) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#0A66C2">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  'traffic-twitter': {
    label: 'X (Twitter)',
    category: 'traffic',
    brandColor: '#000000',
    icon: (size = 24) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#000000">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
};

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

const getAnchorPosition = (node, anchor) => {
  const w = node.width || 260;
  const h = node.height || 120;
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
  const w1 = node1.width || 260;
  const h1 = node1.height || 120;
  const w2 = node2.width || 260;
  const h2 = node2.height || 120;
  
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
    startSize.current = { w: node.width || 260, h: node.height || 120, x: node.x, y: node.y };
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

  return (
    <div
      className={`wb-node ${typeClass} ${activeClass} ${noPointerClass} ${draftingClass}`}
      style={{ transform: `translate(${node.x}px, ${node.y}px)`, width: node.width || 260, height: node.height || 120 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      data-id={node.id}
    >
      {node.type === 'drawing' ? (
        <svg width="100%" height="100%" viewBox={`0 0 ${node.width} ${node.height}`} preserveAspectRatio="none" style={{ overflow: 'visible', position: 'absolute', top: 0, left: 0 }}>
          <path d={node.pathData} fill="none" stroke={node.borderColor || '#ef4444'} strokeWidth={node.borderWidth || 4} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      ) : node.funnelType && FUNNEL_NODES[node.funnelType] ? (
        /* Funnelytics-style Card */
        <div className="wb-funnel-card" style={{ '--funnel-accent': FUNNEL_NODES[node.funnelType].brandColor }}>
          <div className="wb-funnel-accent" />
          <div className="wb-funnel-body">
            <div className="wb-funnel-icon">
              {FUNNEL_NODES[node.funnelType].icon(28)}
            </div>
            <span className="wb-funnel-label">{FUNNEL_NODES[node.funnelType].label}</span>
          </div>
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

      {node.type !== 'drawing' && !(node.funnelType && FUNNEL_NODES[node.funnelType]) && <EditorContent editor={editor} className="wb-node-editor" />}

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
        return (
          n.x < newLasso.x + newLasso.w &&
          n.x + (n.width || 260) > newLasso.x &&
          n.y < newLasso.y + newLasso.h &&
          n.y + (n.height || 120) > newLasso.y
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
    if (e.ctrlKey || e.metaKey) {
      const zoomSensitivity = 0.005;
      const delta = -e.deltaY * zoomSensitivity;
      setCamera((prev) => {
        let newZoom = prev.zoom + delta;
        newZoom = Math.max(0.1, Math.min(newZoom, 5));
        return { ...prev, zoom: newZoom };
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
  }, [handleWheel]);

  const addNodeAtPosition = useCallback((type, clientX, clientY) => {
    saveHistory();
    const defaultSizes = { 
      'text': { w: 200, h: 50 }, 'post-it': { w: 260, h: 120 }, 'rounded-rect': { w: 200, h: 100 }, 'circle': { w: 160, h: 160 }, 'diamond': { w: 180, h: 180 }, 'comment': { w: 240, h: 80 },
      'page-optin': { w: 160, h: 60 }, 'page-sales': { w: 160, h: 60 }, 'page-vsl': { w: 160, h: 60 }, 'page-checkout': { w: 160, h: 60 }, 'page-thankyou': { w: 160, h: 60 },
      'action-purchase': { w: 160, h: 60 }, 'action-lead': { w: 160, h: 60 }
    };
    // Traffic sources get their size from FUNNEL_NODES
    Object.keys(FUNNEL_NODES).forEach(key => { defaultSizes[key] = { w: 180, h: 72 }; });
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
        <details className="wb-palette-group" open>
          <summary className="wb-palette-title">Básico</summary>
          <div className="wb-palette-items wb-palette-items--traffic">
            <button className="wb-traffic-palette-btn" onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'text', mouseX: e.clientX, mouseY: e.clientY }); }} title="Texto Solto">
              <span className="wb-traffic-palette-icon"><Type size={18} color="#64748b" /></span>
              <span className="wb-traffic-palette-label">Texto</span>
            </button>
            <button className="wb-traffic-palette-btn" onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'post-it', mouseX: e.clientX, mouseY: e.clientY }); }} title="Nota (Post-it)">
              <span className="wb-traffic-palette-icon" style={{ background: '#FFF3B0' }}><StickyNote size={18} color="#ca8a04" /></span>
              <span className="wb-traffic-palette-label">Post-it</span>
            </button>
            <button className="wb-traffic-palette-btn" onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'comment', mouseX: e.clientX, mouseY: e.clientY }); }} title="Comentário">
              <span className="wb-traffic-palette-icon"><MessageSquare size={18} color="#64748b" /></span>
              <span className="wb-traffic-palette-label">Comentário</span>
            </button>
            <button className="wb-traffic-palette-btn" onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'rounded-rect', mouseX: e.clientX, mouseY: e.clientY }); }} title="Retângulo">
              <span className="wb-traffic-palette-icon"><Square size={18} color="#3182ce" /></span>
              <span className="wb-traffic-palette-label">Retângulo</span>
            </button>
            <button className="wb-traffic-palette-btn" onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'circle', mouseX: e.clientX, mouseY: e.clientY }); }} title="Círculo">
              <span className="wb-traffic-palette-icon"><Circle size={18} color="#3182ce" /></span>
              <span className="wb-traffic-palette-label">Círculo</span>
            </button>
            <button className="wb-traffic-palette-btn" onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'diamond', mouseX: e.clientX, mouseY: e.clientY }); }} title="Losango (Decisão)">
              <span className="wb-traffic-palette-icon"><Diamond size={18} color="#3182ce" /></span>
              <span className="wb-traffic-palette-label">Losango</span>
            </button>
          </div>
        </details>
        
        <details className="wb-palette-group" open>
          <summary className="wb-palette-title">Tráfego</summary>
          <div className="wb-palette-items wb-palette-items--traffic">
            {TRAFFIC_PALETTE_ITEMS.map(item => (
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
        
        <details className="wb-palette-group" open>
          <summary className="wb-palette-title">Páginas</summary>
          <div className="wb-palette-items wb-palette-items--traffic">
            <button className="wb-traffic-palette-btn" onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'page-optin', mouseX: e.clientX, mouseY: e.clientY }); }} title="Opt-in / Landing Page">
              <span className="wb-traffic-palette-icon" style={{ background: '#dcfce7' }}><LayoutTemplate size={18} color="#16a34a" /></span>
              <span className="wb-traffic-palette-label">Landing Page</span>
            </button>
            <button className="wb-traffic-palette-btn" onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'page-sales', mouseX: e.clientX, mouseY: e.clientY }); }} title="Página de Vendas">
              <span className="wb-traffic-palette-icon" style={{ background: '#dcfce7' }}><ShoppingBag size={18} color="#16a34a" /></span>
              <span className="wb-traffic-palette-label">Pág. de Vendas</span>
            </button>
            <button className="wb-traffic-palette-btn" onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'page-vsl', mouseX: e.clientX, mouseY: e.clientY }); }} title="VSL">
              <span className="wb-traffic-palette-icon" style={{ background: '#dcfce7' }}><Video size={18} color="#16a34a" /></span>
              <span className="wb-traffic-palette-label">VSL</span>
            </button>
            <button className="wb-traffic-palette-btn" onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'page-checkout', mouseX: e.clientX, mouseY: e.clientY }); }} title="Checkout">
              <span className="wb-traffic-palette-icon" style={{ background: '#dcfce7' }}><CreditCard size={18} color="#16a34a" /></span>
              <span className="wb-traffic-palette-label">Checkout</span>
            </button>
            <button className="wb-traffic-palette-btn" onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'page-thankyou', mouseX: e.clientX, mouseY: e.clientY }); }} title="Thank You Page">
              <span className="wb-traffic-palette-icon" style={{ background: '#dcfce7' }}><CheckCircle size={18} color="#16a34a" /></span>
              <span className="wb-traffic-palette-label">Thank You</span>
            </button>
          </div>
        </details>
        
        <details className="wb-palette-group" open>
          <summary className="wb-palette-title">Ações</summary>
          <div className="wb-palette-items wb-palette-items--traffic">
            <button className="wb-traffic-palette-btn" onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'action-purchase', mouseX: e.clientX, mouseY: e.clientY }); }} title="Compra">
              <span className="wb-traffic-palette-icon" style={{ background: '#ffedd5' }}><BadgeDollarSign size={18} color="#ea580c" /></span>
              <span className="wb-traffic-palette-label">Compra</span>
            </button>
            <button className="wb-traffic-palette-btn" onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'action-lead', mouseX: e.clientX, mouseY: e.clientY }); }} title="Lead">
              <span className="wb-traffic-palette-icon" style={{ background: '#ffedd5' }}><UserPlus size={18} color="#ea580c" /></span>
              <span className="wb-traffic-palette-label">Lead</span>
            </button>
          </div>
        </details>
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
