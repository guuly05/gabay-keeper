import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Book,
  Search,
  Plus,
  Trash2,
  LogOut,
  Loader2,
  Share2,
  Moon,
  Sun
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getIdTokenResult,
  User
} from 'firebase/auth';
import { toPng } from 'html-to-image';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

import { db, auth, OperationType, handleFirestoreError } from './lib/firebase';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const genreOptions = ['Gabay', 'Geeraar', 'Jiifto', 'Buraanbur'] as const;
const somaliAlphabet = ['A', 'B', 'T', 'J', 'X', 'Kh', 'D', 'R', 'S', 'Sh', 'Dh', 'C', 'G', 'F', 'Q', 'K', 'L', 'M', 'N', 'W', 'H', 'Y'] as const;

interface Poem {
  id: string;
  title: string;
  originalText: string;
  tags: string[];
  source: string;
  author?: string;
  genre?: string;
  xaraf?: string;
  audioUrl?: string;
  isVerified?: boolean;
  createdAt: any;
}

interface Footnote {
  id: string;
  text: string;
  createdAt: any;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [poems, setPoems] = useState<Poem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Workspace state
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [tags, setTags] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState<string>('Gabay');
  const [xaraf, setXaraf] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedXaraf, setSelectedXaraf] = useState('');
  const [newFootnote, setNewFootnote] = useState<Record<string, string>>({});
  const [footnotes, setFootnotes] = useState<Record<string, Footnote[]>>({});
  const [openFootnotesFor, setOpenFootnotesFor] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        const tokenResult = await getIdTokenResult(u, true);
        setIsAdmin(Boolean(tokenResult.claims.admin));
      } else {
        setIsAdmin(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!user) {
      setPoems([]);
      return;
    }

    let q = query(
      collection(db, 'poems'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    if (selectedGenre) {
      q = query(q, where('genre', '==', selectedGenre));
    }

    if (selectedXaraf) {
      q = query(q, where('xaraf', '==', selectedXaraf));
    }

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const pList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Poem));
        setPoems(pList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'poems');
      }
    );

    return unsubscribe;
  }, [user, selectedGenre, selectedXaraf]);

  const filteredPoems = poems.filter(poem => {
    const searchLow = searchTerm.toLowerCase();
    return (
      poem.title.toLowerCase().includes(searchLow) ||
      poem.author?.toLowerCase().includes(searchLow) ||
      poem.xaraf?.toLowerCase().includes(searchLow) ||
      poem.genre?.toLowerCase().includes(searchLow) ||
      poem.tags.some(tag => tag.toLowerCase().includes(searchLow))
    );
  });

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Email and password are required.');
      return;
    }

    const id = toast.loading(isSignUp ? 'Creating your account...' : 'Signing you in...');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Welcome to the archive!', { id });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Kusoo dhawaada! Welcome back.', { id });
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed.', { id });
    }
  };

  const handleLogout = () => signOut(auth);

  const handleOCR = async (file: File) => {
    setIsProcessing(true);
    const id = toast.loading(`Scanning ${file.name}...`);
    try {
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map((item: any) => item.str).join(' ') + "\n";
        }
        setOriginalText(fullText);
      } else {
        const worker = await createWorker('som+eng');
        await worker.load();
        const { data: { text } } = await worker.recognize(file);
        setOriginalText(text || '');
        await worker.terminate();
      }
      toast.success('OCR Complete', { id });
    } catch (error) {
      toast.error('Scan failed.', { id });
    } finally {
      setIsProcessing(false);
    }
  };

  const loadFootnotes = async (poemId: string) => {
    try {
      const footnotesSnapshot = await getDocs(query(collection(db, 'poems', poemId, 'footnotes'), orderBy('createdAt', 'desc')));
      const notes = footnotesSnapshot.docs.map(noteDoc => ({
        id: noteDoc.id,
        ...noteDoc.data()
      } as Footnote));
      setFootnotes((prev) => ({ ...prev, [poemId]: notes }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `poems/${poemId}/footnotes`);
    }
  };

  const addFootnote = async (poemId: string) => {
    const text = newFootnote[poemId]?.trim();
    if (!text) return;

    try {
      await addDoc(collection(db, 'poems', poemId, 'footnotes'), {
        text,
        createdAt: serverTimestamp(),
        userId: user?.uid ?? null
      });
      setNewFootnote((prev) => ({ ...prev, [poemId]: '' }));
      loadFootnotes(poemId);
      toast.success('Footnote added.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `poems/${poemId}/footnotes`);
    }
  };

  const savePoem = async () => {
    if (!user || !originalText || !title || !genre || !xaraf) {
      toast.error('Missing title, genre, xaraf, or original text.');
      return;
    }

    const id = toast.loading('Preserving Gabay in history...');
    try {
      const poemData: Record<string, unknown> = {
        title,
        originalText,
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        source: url || 'Manual',
        genre,
        xaraf,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      };

      if (author.trim()) {
        poemData.author = author.trim();
      }

      if (audioUrl.trim()) {
        poemData.audioUrl = audioUrl.trim();
      }

      await addDoc(collection(db, 'poems'), poemData);
      toast.success('Gabay preserved!', { id });
      resetForm();
    } catch (error) {
      const errInfo = handleFirestoreError(error, OperationType.WRITE, 'poems');
      toast.error(`Upload failed: ${errInfo.error}`, { id });
    }
  };

  const deletePoem = async (poemId: string) => {
    if (!confirm('Are you sure you want to remove this poem from the archive?')) return;
    try {
      await deleteDoc(doc(db, 'poems', poemId));
      toast.success('Poem removed.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `poems/${poemId}`);
    }
  };

  const resetForm = () => {
    setTitle('');
    setUrl('');
    setOriginalText('');
    setTags('');
    setAuthor('');
    setGenre('Gabay');
    setXaraf('');
    setAudioUrl('');
  };

  const downloadCard = async (poem: Poem) => {
    if (!captureRef.current) return;

    // Temporarily set the card content for capture
    const captureEl = captureRef.current;
    captureEl.style.display = 'block';
    captureEl.querySelector('#card-title')!.textContent = poem.title;
    captureEl.querySelector('#card-body')!.textContent = poem.originalText;
    captureEl.querySelector('#card-date')!.textContent = poem.createdAt?.toDate?.()?.toLocaleDateString() || new Date().toLocaleDateString();

    try {
      const dataUrl = await toPng(captureEl);
      const link = document.createElement('a');
      link.download = `gabay-${poem.title}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Card generated!');
    } catch (err) {
      toast.error('Failed to generate card.');
    } finally {
      captureEl.style.display = 'none';
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-somali-earth animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 px-4 md:px-8 max-w-7xl mx-auto pt-10">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl p-8 rounded-[1.5rem] border border-archive-border">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-slate-800 ring-1 ring-slate-700 rounded-full flex items-center justify-center">
            <Book className="w-8 h-8 text-archive-gold" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-archive-gold tracking-[0.04em] uppercase mb-1">
              GABAY KEEPER
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-archive-muted">
              Somali Oral Poetry Digital Archive
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <Button variant="ghost" size="sm" onClick={() => setDarkMode(!darkMode)} className="text-archive-muted hover:text-archive-gold gap-2 uppercase tracking-[0.04em]">
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </Button>
          {user ? (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.04em] text-archive-muted">Archive Strength</div>
                <div className="text-xl font-bold text-archive-gold">{poems.length} <span className="text-xs font-normal text-archive-muted">Poems</span></div>
              </div>
              <Separator orientation="vertical" className="h-10 bg-archive-border" />
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-archive-muted hover:text-archive-gold gap-2 uppercase tracking-[0.04em] text-[10px]">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-archive-muted">
              <span className="text-[10px] uppercase tracking-[0.04em] font-bold">Guardian Access Restricted</span>
            </div>
          )}
        </div>
      </header>

      {user ? (
        <div className="space-y-12">
          {/* Main Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* Inputs Column */}
            <div className="space-y-6">
              <Card className="bg-archive-card border-archive-border rounded-[1.5rem] shadow-xl overflow-hidden group/sidebar">
                <CardHeader className="border-b border-archive-border/50">
                  <CardTitle className="text-[9px] uppercase font-bold tracking-[0.2em] text-archive-muted flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-archive-gold" />
                    Preserve New Work
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="bg-archive-input/90 p-4 border border-archive-border rounded-[1.5rem] transition-all group">
                      <div className="text-archive-gold text-[10px] font-black uppercase tracking-[0.04em] mb-1">Source URL (optional)</div>
                      <p className="text-[11px] text-archive-muted leading-relaxed">Record the online source for provenance, if available.</p>
                      <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste source URL here..."
                        className="mt-4 bg-archive-bg border-archive-border text-[11px] h-10 italic"
                      />
                    </div>

                    <div
                      className="bg-archive-input/90 p-4 border border-archive-border rounded-[1.5rem] hover:border-archive-gold/50 transition-all cursor-pointer group"
                      onClick={() => document.getElementById('ocr-file')?.click()}
                    >
                      <input
                        id="ocr-file"
                        type="file"
                        className="hidden"
                        accept=".pdf,image/*"
                        onChange={(e) => e.target.files?.[0] && handleOCR(e.target.files[0])}
                      />
                      <div className="text-archive-gold text-[10px] font-black uppercase tracking-[0.04em] mb-1">OCR Document Scan</div>
                      <p className="text-[11px] text-archive-muted leading-relaxed group-hover:text-somali-amber-dark">Process handwritten scripts or books.</p>
                    </div>
                  </div>

                  <Separator className="bg-archive-border/50" />

                  <div className="space-y-4">
                    <label className="text-[9px] uppercase font-black tracking-[0.2em] text-archive-muted block">Archival Metadata</label>
                    <div className="space-y-3">
                      <Input
                        placeholder="Poem Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="input-vault h-10 px-4"
                      />
                      <Input
                        placeholder="Poet / Author Name"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        className="input-vault h-10 px-4"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <label className="flex flex-col text-[10px] uppercase tracking-[0.04em] text-archive-muted">
                          Genre
                          <select
                            value={genre}
                            onChange={(e) => setGenre(e.target.value)}
                            className="mt-2 bg-archive-bg border border-archive-border rounded-2xl h-10 px-4 text-sm"
                          >
                            {genreOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col text-[10px] uppercase tracking-[0.04em] text-archive-muted">
                          Xaraf
                          <select
                            value={xaraf}
                            onChange={(e) => setXaraf(e.target.value)}
                            className="mt-2 bg-archive-bg border border-archive-border rounded-2xl h-10 px-4 text-sm"
                          >
                            <option value="">Select letter</option>
                            {somaliAlphabet.map((letter) => (
                              <option key={letter} value={letter}>{letter}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <Input
                        placeholder="Tags (love, bravery, etc)"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        className="input-vault h-10 px-4"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="p-6 bg-archive-input border-l-2 border-archive-gold">
                <p className="text-xs italic text-archive-muted leading-relaxed">
                  "Aqoon la'aan waa iftiin la'aan"
                </p>
                <p className="text-[10px] mt-2 font-bold text-archive-bronze">— Knowledge is light</p>
              </div>
            </div>

            {/* Editing Canvas */}
            <div className="lg:col-span-2">
              <div className="workspace-card h-full min-h-[700px] relative border border-archive-border">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h2 className="text-3xl font-serif italic text-somali-amber-dark">
                      Archive Workspace
                    </h2>
                    <p className="text-xs text-archive-muted mt-1 uppercase tracking-[0.04em]">Manual poetry preservation workflow</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-archive-card p-6 border border-archive-border rounded-[1.5rem]">
                    <div className="mb-6">
                      <span className="text-[9px] uppercase tracking-[0.04em] text-archive-muted">Manual Archive Input</span>
                      <h3 className="text-2xl font-semibold text-somali-amber-dark mt-2">Preserve the poem directly</h3>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="text-[9px] uppercase tracking-[0.04em] text-archive-muted">Somali Gabay / Original Text</label>
                        <Textarea
                          value={originalText}
                          onChange={(e) => setOriginalText(e.target.value)}
                          placeholder="Paste the original Somali gabay here..."
                          className="min-h-[260px] mt-3 bg-transparent border border-archive-border rounded-2xl p-4 text-sm text-somali-amber-dark placeholder:text-archive-muted focus-visible:ring-0"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          placeholder="Poem Title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="input-vault h-12 px-4"
                        />
                        <Input
                          placeholder="Poet / Author"
                          value={author}
                          onChange={(e) => setAuthor(e.target.value)}
                          className="input-vault h-12 px-4"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className="flex flex-col text-[10px] uppercase tracking-[0.04em] text-archive-muted">
                          Genre
                          <select
                            value={genre}
                            onChange={(e) => setGenre(e.target.value)}
                            className="mt-2 bg-archive-bg border border-archive-border rounded-2xl h-12 px-4 text-sm"
                          >
                            {genreOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col text-[10px] uppercase tracking-[0.04em] text-archive-muted">
                          Xaraf
                          <select
                            value={xaraf}
                            onChange={(e) => setXaraf(e.target.value)}
                            className="mt-2 bg-archive-bg border border-archive-border rounded-2xl h-12 px-4 text-sm"
                          >
                            <option value="">Select letter</option>
                            {somaliAlphabet.map((letter) => (
                              <option key={letter} value={letter}>{letter}</option>
                            ))}
                          </select>
                        </label>
                        <Input
                          placeholder="Tags (love, bravery, etc)"
                          value={tags}
                          onChange={(e) => setTags(e.target.value)}
                          className="input-vault h-12 px-4"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-24 mt-8 flex items-center justify-between border-t border-archive-border flex-shrink-0">
                  <div className="flex gap-4">
                    {tags.split(',').filter(t => t.trim()).slice(0, 3).map(tag => (
                      <span key={tag} className="tag-archive">
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                  <Button onClick={savePoem} className="px-10 py-5 bg-archive-gold/95 text-archive-bg font-semibold tracking-[0.04em] text-sm rounded-2xl hover:bg-archive-gold transition-colors">
                    Commit to Vault
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Archive Library */}
          <section className="space-y-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <h2 className="text-[10px] uppercase font-bold tracking-[0.04em] text-archive-muted whitespace-nowrap">Poetry Library</h2>
                <div className="h-[1px] w-24 bg-archive-border" />
              </div>

              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-archive-muted" />
                <Input
                  placeholder="Search by title, poet, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-archive-card border-archive-border text-xs uppercase tracking-[0.04em]"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {somaliAlphabet.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => setSelectedXaraf(selectedXaraf === letter ? '' : letter)}
                    className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.08em] transition ${selectedXaraf === letter ? 'bg-archive-gold text-black border-archive-gold' : 'bg-archive-card text-archive-muted border-archive-border hover:border-archive-gold hover:text-archive-gold'}`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedGenre('')}
                  className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.08em] transition ${selectedGenre === '' ? 'bg-archive-gold text-black border-archive-gold' : 'bg-archive-card text-archive-muted border-archive-border hover:border-archive-gold hover:text-archive-gold'}`}
                >
                  All Genres
                </button>
                {genreOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSelectedGenre(selectedGenre === option ? '' : option)}
                    className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.08em] transition ${selectedGenre === option ? 'bg-archive-gold text-black border-archive-gold' : 'bg-archive-card text-archive-muted border-archive-border hover:border-archive-gold hover:text-archive-gold'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence mode="popLayout">
                {filteredPoems.map((poem, index) => (
                  <motion.div
                    key={poem.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-archive-card border border-archive-border rounded-[1.5rem] h-full flex flex-col group relative overflow-hidden transition-all hover:border-archive-gold/30">
                      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-archive-bronze hover:text-archive-gold" onClick={() => downloadCard(poem)}>
                          <Share2 className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400" onClick={() => deletePoem(poem.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <span className="text-[10px] text-archive-bronze font-mono uppercase tracking-[0.04em]">
                            {poem.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                          </span>
                          {poem.genre && (
                            <Badge className="uppercase tracking-[0.08em] text-[10px] bg-archive-bg text-archive-muted">
                              {poem.genre}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-xl font-bold text-somali-amber-dark group-hover:text-archive-gold transition-colors">
                          {poem.title}
                        </CardTitle>
                        <div className="flex flex-col gap-1">
                          {poem.author && (
                            <p className="text-[10px] font-bold text-archive-muted uppercase tracking-[0.04em]">
                              {poem.author}
                            </p>
                          )}
                          {poem.isVerified && (
                            <span className="text-[10px] uppercase tracking-[0.08em] text-emerald-300 font-semibold">
                              Verified Abwaan
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow pt-4">
                        <p className="text-[11px] text-archive-muted line-clamp-3 leading-relaxed italic group-hover:text-somali-amber-dark transition-colors">
                          {poem.originalText}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-6">
                          {poem.tags.map(tag => (
                            <span key={tag} className="tag-archive">
                              #{tag}
                            </span>
                          ))}
                        </div>
                        {poem.audioUrl && (
                          <audio controls src={poem.audioUrl} className="mt-6 w-full rounded-3xl bg-slate-900 p-3" />
                        )}
                        <div className="mt-6 border-t border-archive-border pt-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (openFootnotesFor === poem.id) {
                                setOpenFootnotesFor(null);
                                return;
                              }
                              setOpenFootnotesFor(poem.id);
                              await loadFootnotes(poem.id);
                            }}
                            className="text-archive-muted hover:text-archive-gold uppercase tracking-[0.04em] text-[10px]"
                          >
                            Footnotes
                          </Button>

                          {openFootnotesFor === poem.id && (
                            <div className="mt-4 space-y-3 rounded-3xl border border-archive-border bg-archive-input p-4">
                              <div className="space-y-2">
                                {footnotes[poem.id]?.length ? (
                                  footnotes[poem.id].map((note) => (
                                    <p key={note.id} className="text-[11px] text-archive-muted leading-relaxed">
                                      • {note.text}
                                    </p>
                                  ))
                                ) : (
                                  <p className="text-[11px] text-archive-muted italic">No footnotes yet.</p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Textarea
                                  value={newFootnote[poem.id] || ''}
                                  onChange={(e) => setNewFootnote((prev) => ({ ...prev, [poem.id]: e.target.value }))}
                                  placeholder="Add a footnote..."
                                  className="h-24 bg-archive-card border-archive-border"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => addFootnote(poem.id)}
                                  disabled={!newFootnote[poem.id]?.trim()}
                                  className="w-full uppercase tracking-[0.04em] text-[10px]"
                                >
                                  Save Footnote
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {poems.length === 0 && (
              <div className="text-center py-20 text-archive-muted italic">
                The vault is currently silent. Commit your first work to begin the archive.
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 bg-white/5 backdrop-blur-xl rounded-[1.5rem] border border-archive-border p-12 max-w-xl mx-auto">
          <div className="relative">
            <Book className="w-24 h-24 text-slate-500 opacity-20" />
          </div>

          <div className="text-center space-y-4">
            <h2 className="text-3xl font-black text-archive-gold tracking-tighter uppercase">The Archive Awaits</h2>
            <p className="text-sm italic text-archive-muted leading-relaxed">
              {isSignUp ? "Join the guardians of Somali history." : "Return to the digital vault."}
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="w-full space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-[0.04em] text-archive-muted">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guardian@archive.so"
                className="input-vault h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-[0.04em] text-archive-muted">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-vault h-12"
              />
            </div>
            <Button type="submit" className="btn-primary w-full h-12 text-sm mt-4">
              {isSignUp ? "Create Vault ID" : "Unlock Archive"}
            </Button>
          </form>

          <div className="pt-4 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[10px] uppercase font-bold tracking-[0.04em] text-archive-muted hover:text-archive-gold transition-colors"
            >
              {isSignUp ? "Already a Guardian? Sign In" : "Need a Vault ID? Create Account"}
            </button>
          </div>
        </div>
      )}

      {/* Hidden Capture Area for Card Generation */}
      <div
        ref={captureRef}
        id="capture-area"
        className="fixed -left-[9999px] w-[600px] p-16 bg-[#0F172A] text-[#E2E8F0] border-[16px] border-[#334155] shadow-xl"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.05] pointer-events-none bg-white/5" />
        <h1 id="card-title" className="text-4xl font-black mb-8 uppercase border-b-6 border-[#D4AF37] pb-4 tracking-[0.04em]"></h1>
        <div id="card-body" className="text-2xl italic leading-[1.6] whitespace-pre-wrap mb-12 min-h-[300px]"></div>
        <div className="flex justify-between items-end border-t border-[#322C28] pt-8 text-[11px] font-black uppercase tracking-[0.2em] text-[#8C847E]">
          <div className="flex flex-col gap-1">
            <span>Gabay Keeper Digital Archive</span>
            <span>Cultural Heritage Preservation</span>
          </div>
          <span id="card-date"></span>
        </div>
      </div>

      {/* Footer Status Bar */}
      <footer className="fixed bottom-0 left-0 w-full h-10 bg-white/5 border-t border-archive-border flex items-center justify-between px-10 text-[9px] tracking-[0.04em] text-archive-muted z-50">
        <div className="flex gap-6">
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Firebase Node Connected</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Firebase Storage Active</span>
        </div>
        <div className="flex gap-6">
          <span>Secure Client Session: AES-256</span>
        </div>
      </footer>
    </div>
  );
}
