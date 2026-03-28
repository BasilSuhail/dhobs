"use client"

import { useState, useCallback } from "react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { 
  File, 
  Folder, 
  Upload, 
  MoreVertical, 
  Download, 
  Trash2, 
  Search, 
  Plus, 
  HardDrive,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  ChevronRight
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface FileItem {
  id: string
  name: string
  type: 'file' | 'folder'
  size?: string
  lastModified: string
  extension?: string
}

const mockFiles: FileItem[] = [
  { id: '1', name: 'Documents', type: 'folder', lastModified: '2024-03-20' },
  { id: '2', name: 'Images', type: 'folder', lastModified: '2024-03-18' },
  { id: '3', name: 'Project_Proposal.pdf', type: 'file', size: '2.4 MB', extension: 'pdf', lastModified: '2024-03-24' },
  { id: '4', name: 'System_Logs.txt', type: 'file', size: '156 KB', extension: 'txt', lastModified: '2024-03-25' },
  { id: '5', name: 'Hero_Banner.jpg', type: 'file', size: '4.2 MB', extension: 'jpg', lastModified: '2024-03-22' },
  { id: '6', name: 'Background_Music.mp3', type: 'file', size: '8.5 MB', extension: 'mp3', lastModified: '2024-03-21' },
]

export function StorageSection() {
  const { colorTheme } = useTheme()
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<FileItem[]>(mockFiles)
  const [searchQuery, setSearchQuery] = useState("")

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    const newFiles: FileItem[] = droppedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: 'file',
      size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
      extension: file.name.split('.').pop(),
      lastModified: new Date().toISOString().split('T')[0]
    }))

    setFiles(prev => [...newFiles, ...prev])
  }, [])

  const getFileIcon = (item: FileItem) => {
    if (item.type === 'folder') return <Folder className="h-5 w-5 text-blue-400" />
    
    switch (item.extension?.toLowerCase()) {
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
        return <FileText className="h-5 w-5 text-orange-400" />
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <ImageIcon className="h-5 w-5 text-pink-400" />
      case 'mp3':
      case 'wav':
        return <Music className="h-5 w-5 text-purple-400" />
      case 'mp4':
      case 'mov':
        return <Video className="h-5 w-5 text-emerald-400" />
      default:
        return <File className="h-5 w-5 text-gray-400" />
    }
  }

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <section className="h-screen w-full pl-24 pr-8 py-8 flex flex-col gap-6 overflow-hidden">
      {/* Storage Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: colorTheme.foreground }}>
            Cloud Storage
          </h2>
          <p className="text-foreground/50 mt-1">Manage and organize your files with ease</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10">
            <Plus className="mr-2 h-4 w-4" /> New Folder
          </Button>
          <Button style={{ backgroundColor: colorTheme.accent, color: colorTheme.accentForeground }}>
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Capacity', value: '2 TB', icon: HardDrive, color: colorTheme.accent },
          { label: 'Used Space', value: '456 GB', icon: Activity, color: '#22d3ee' },
          { label: 'Documents', value: '1,245 files', icon: FileText, color: '#fb923c' },
          { label: 'Media', value: '842 files', icon: Video, color: '#a855f7' },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-2">
              <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
              <span className="text-xs font-medium text-foreground/50 uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="text-xl font-bold" style={{ color: colorTheme.foreground }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* File Explorer Container */}
      <div 
        className={cn(
          "flex-1 flex flex-col rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl overflow-hidden transition-all duration-300",
          isDragging && "border-white/40 bg-white/[0.05] ring-2 ring-white/20"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Explorer Toolbar */}
        <div className="p-4 border-b border-white/[0.06] flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input 
              placeholder="Search files..." 
              className="pl-10 bg-white/5 border-white/10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-white/40">
            <span>Root</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white/80">Home</span>
          </div>
        </div>

        {/* File List */}
        <ScrollArea className="flex-1 p-4 relative">
          {isDragging && (
            <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 pointer-events-none">
              <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-white animate-bounce" />
              </div>
              <h3 className="text-xl font-semibold text-white">Drop to upload</h3>
              <p className="text-white/40">Your files will be added to the current directory</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {filteredFiles.map((item) => (
              <div 
                key={item.id}
                className="group p-4 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/[0.04] transition-all cursor-pointer relative"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-white/5">
                    {getFileIcon(item)}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                        <MoreVertical className="h-4 w-4 text-white/40" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-black/90 border-white/10 text-white">
                      <DropdownMenuItem className="focus:bg-white/10">
                        <Download className="mr-2 h-4 w-4" /> Download
                      </DropdownMenuItem>
                      <DropdownMenuItem className="focus:bg-white/10 text-red-400 focus:text-red-400">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h4 className="text-sm font-medium truncate mb-1" style={{ color: colorTheme.foreground }}>
                  {item.name}
                </h4>
                <div className="flex items-center justify-between text-[10px] text-white/40 font-medium uppercase tracking-wider">
                  <span>{item.type === 'folder' ? 'Folder' : item.size}</span>
                  <span>{item.lastModified}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Selection Status */}
        <div className="px-6 py-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/40">
          <div className="flex gap-4">
            <span>{filteredFiles.length} items</span>
            <span>1.5 TB available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: '22%' }} />
            </div>
            <span>22% used</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function Activity(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}
