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
  ThumbsUp, Search, Mail, Camera, LayoutTemplate, ShoppingBag, Video, CreditCard, CheckCircle, BadgeDollarSign, UserPlus
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
      <div className="wb-global-toolbar">
        <div className="wb-toolbar-section">
          <select 
            className="wb-toolbar-select" 
            style={{ paddingLeft: 8, paddingRight: 20 }}
            value={activeConn.lineType || 'bezier'}
            onChange={(e) => updateConnection(activeConn.id, { lineType: e.target.value })}
            title="Tipo de Linha"
          >
            <option value="bezier">Curva</option>
            <option value="straight">Reta</option>
            <option value="orthogonal">Ortogonal</option>
          </select>
        </div>
        <div className="wb-toolbar-divider" />
        <button onClick={onDelete} className="wb-toolbar-btn" style={{ color: 'var(--red-600)' }} title="Deletar Conexão"><Trash2 size={16} /></button>
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

const getConnectionPath = (fromX, fromY, fromAnchor, toX, toY, toAnchor, lineType = 'bezier') => {
  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);
  const dist = Math.sqrt(dx * dx + dy * dy);

  let angle = 0;
  if (toAnchor === 'top') angle = 90; 
  else if (toAnchor === 'bottom') angle = -90; 
  else if (toAnchor === 'left') angle = 0; 
  else if (toAnchor === 'right') angle = 180; 
  else {
    angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
  }

  if (lineType === 'straight') {
    return { 
      path: `M ${fromX} ${fromY} L ${toX} ${toY}`, 
      angle, 
      midX: (fromX + toX) / 2, 
      midY: (fromY + toY) / 2 
    };
  }
  
  if (lineType === 'orthogonal') {
    let midX = (fromX + toX) / 2;
    let midY = (fromY + toY) / 2;
    let path = '';
    
    // Simple orthogonal routing
    if (fromAnchor === 'left' || fromAnchor === 'right' || toAnchor === 'left' || toAnchor === 'right') {
      path = `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`;
    } else {
      path = `M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`;
    }

    return { path, angle, midX, midY };
  }

  // bezier
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
  
  if (toAnchor === 'center') {
    if (cp2.cx === toX && cp2.cy === toY) {
      angle = Math.atan2(toY - cp1.cy, toX - cp1.cx) * 180 / Math.PI;
    } else {
      angle = Math.atan2(toY - cp2.cy, toX - cp2.cx) * 180 / Math.PI;
    }
  }

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
  const cx = node.x + (node.width || 260) / 2;
  const cy = node.y + (node.height || 120) / 2;
  switch (anchor) {
    case 'top': return { x: cx, y: node.y };
    case 'bottom': return { x: cx, y: node.y + (node.height || 120) };
    case 'left': return { x: node.x, y: cy };
    case 'right': return { x: node.x + (node.width || 260), y: cy };
    default: return { x: cx, y: cy };
  }
};

const Connection = ({ conn, nodes, updateConnection, isSelected, onSelect }) => {
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

  const fromPos = getAnchorPosition(fromNode, conn.fromAnchor || 'center');
  const toPos = getAnchorPosition(toNode, conn.toAnchor || 'center');

  const { path, angle, midX, midY } = snapped 
    ? getConnectionPath(fromPos.x, fromPos.y, conn.fromAnchor || 'center', toPos.x, toPos.y, conn.toAnchor || 'center', conn.lineType || 'bezier')
    : getRopePath(fromPos.x, fromPos.y, toPos.x, toPos.y);

  return (
    <g>
      <path 
        d={path} 
        className="wb-connection-path wb-anim-snap" 
        onDoubleClick={() => setIsEditing(true)}
        onPointerDown={(e) => { e.stopPropagation(); onSelect(conn.id, e.shiftKey); }}
        style={{ pointerEvents: 'stroke', cursor: 'pointer', strokeWidth: isSelected ? 4 : 2, stroke: isSelected ? '#3b82f6' : '#94a3b8' }}
      />
      <polygon points="0,-6 12,0 0,6" transform={`translate(${toPos.x}, ${toPos.y}) rotate(${angle})`} fill={isSelected ? '#3b82f6' : '#64748b'} className="wb-connection-arrowhead wb-anim-snap" />
      
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
        <foreignObject x={midX - 75} y={midY - 45} width={150} height={80} style={{ overflow: 'visible' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <select 
              value={conn.lineType || 'bezier'}
              onChange={(e) => updateConnection(conn.id, { lineType: e.target.value })}
              style={{ fontSize: '10px', padding: '2px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            >
              <option value="bezier">Curva</option>
              <option value="straight">Reta</option>
              <option value="orthogonal">Ortogonal</option>
            </select>
            <input 
              autoFocus
              className="wb-connection-input"
              defaultValue={conn.label || ''}
              style={{ width: '100%', textAlign: 'center', fontSize: '12px', padding: '4px', borderRadius: '4px', border: '2px solid #3b82f6', outline: 'none' }}
              onBlur={(e) => {
                 // small delay to allow select to be clicked
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

      {node.type !== 'drawing' && <EditorContent editor={editor} className="wb-node-editor" />}

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
      'traffic-facebook': { w: 160, h: 60 }, 'traffic-google': { w: 160, h: 60 }, 'traffic-email': { w: 160, h: 60 }, 'traffic-instagram': { w: 160, h: 60 },
      'page-optin': { w: 160, h: 60 }, 'page-sales': { w: 160, h: 60 }, 'page-vsl': { w: 160, h: 60 }, 'page-checkout': { w: 160, h: 60 }, 'page-thankyou': { w: 160, h: 60 },
      'action-purchase': { w: 160, h: 60 }, 'action-lead': { w: 160, h: 60 }
    };
    const size = defaultSizes[type] || { w: 200, h: 100 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const xInsideCanvas = clientX - rect.left;
    const yInsideCanvas = clientY - rect.top;

    const worldX = (xInsideCanvas - camera.x) / camera.zoom - size.w / 2;
    const worldY = (yInsideCanvas - camera.y) / camera.zoom - size.h / 2;

    const titles = {
      'traffic-facebook': 'Facebook Ads', 'traffic-google': 'Google Ads', 'traffic-email': 'E-mail', 'traffic-instagram': 'Instagram',
      'page-optin': 'Opt-in Page', 'page-sales': 'Página de Vendas', 'page-vsl': 'VSL', 'page-checkout': 'Checkout', 'page-thankyou': 'Thank You',
      'action-purchase': 'Compra', 'action-lead': 'Lead'
    };
    
    const colors = {
      'traffic': { bg: '#e0f2fe', border: '#0ea5e9' },
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
          <div className="wb-palette-items">
            <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'text', mouseX: e.clientX, mouseY: e.clientY }); }} title="Texto Solto"><Type size={20} /></button>
            <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'post-it', mouseX: e.clientX, mouseY: e.clientY }); }} title="Nota (Post-it)"><StickyNote size={20} /></button>
            <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'comment', mouseX: e.clientX, mouseY: e.clientY }); }} title="Comentário"><MessageSquare size={20} /></button>
            <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'rounded-rect', mouseX: e.clientX, mouseY: e.clientY }); }} title="Retângulo"><Square size={20} /></button>
            <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'circle', mouseX: e.clientX, mouseY: e.clientY }); }} title="Círculo"><Circle size={20} /></button>
            <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'diamond', mouseX: e.clientX, mouseY: e.clientY }); }} title="Losango (Decisão)"><Diamond size={20} /></button>
          </div>
        </details>
        
        <details className="wb-palette-group" open>
          <summary className="wb-palette-title">Tráfego</summary>
          <div className="wb-palette-items">
            <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'traffic-facebook', mouseX: e.clientX, mouseY: e.clientY }); }} title="Facebook Ads"><ThumbsUp size={20} /></button>
            <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'traffic-google', mouseX: e.clientX, mouseY: e.clientY }); }} title="Google Ads"><Search size={20} /></button>
            <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'traffic-email', mouseX: e.clientX, mouseY: e.clientY }); }} title="E-mail"><Mail size={20} /></button>
            <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'traffic-instagram', mouseX: e.clientX, mouseY: e.clientY }); }} title="Instagram"><Camera size={20} /></button>
          </div>
        </details>
        
        <details className="wb-palette-group" open>
          <summary className="wb-palette-title">Páginas</summary>
          <div className="wb-palette-items">
            <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'page-optin', mouseX: e.clientX, mouseY: e.clientY }); }} title="Opt-in / Landing Page"><LayoutTemplate size={20} /></button>
            <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'page-sales', mouseX: e.clientX, mouseY: e.clientY }); }} title="Página de Vendas"><ShoppingBag size={20} /></button>
            <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'page-vsl', mouseX: e.clientX, mouseY: e.clientY }); }} title="VSL"><Video size={20} /></button>
            <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'page-checkout', mouseX: e.clientX, mouseY: e.clientY }); }} title="Checkout"><CreditCard size={20} /></button>
            <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'page-thankyou', mouseX: e.clientX, mouseY: e.clientY }); }} title="Thank You Page"><CheckCircle size={20} /></button>
          </div>
        </details>
        
        <details className="wb-palette-group" open>
          <summary className="wb-palette-title">Ações</summary>
          <div className="wb-palette-items">
            <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'action-purchase', mouseX: e.clientX, mouseY: e.clientY }); }} title="Compra"><BadgeDollarSign size={20} /></button>
            <button onPointerDown={(e) => { e.preventDefault(); setDraggedShape({ type: 'action-lead', mouseX: e.clientX, mouseY: e.clientY }); }} title="Lead"><UserPlus size={20} /></button>
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
            {connections.map(conn => <Connection key={conn.id} conn={conn} nodes={nodes} updateConnection={updateConnection} isSelected={selectedConnectionIds.includes(conn.id)} onSelect={handleConnectionSelect} />)}
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
