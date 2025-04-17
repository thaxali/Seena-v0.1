import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/Dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Interview, updateInterview } from "@/lib/services/interview"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { X, Pencil, Check, XCircle, Headphones } from "lucide-react"
import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Tag } from "@/components/ui/tag"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface InterviewDetailsDialogProps {
  interview: Interview | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: (interview: Interview) => void
}

export default function InterviewDetailsDialog({
  interview,
  open,
  onOpenChange,
  onUpdate,
}: InterviewDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTranscript, setEditedTranscript] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEditClick = () => {
    setEditedTranscript(interview?.transcript || "")
    setIsEditing(true)
    setError(null)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedTranscript("")
    setError(null)
  }

  const handleSave = async () => {
    if (!interview) return
    
    try {
      setIsSaving(true)
      setError(null)
      const updatedInterview = await updateInterview(interview.id, editedTranscript)
      if (updatedInterview) {
        onUpdate?.(updatedInterview)
        setIsEditing(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes")
    } finally {
      setIsSaving(false)
    }
  }

  if (!interview) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-lg p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-gray-100 relative flex items-start">
          <DialogTitle className="text-2xl font-semibold text-gray-900 pr-12">
            {interview.title}
          </DialogTitle>
          <DialogClose className="absolute right-6 top-6 rounded-full p-2 hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </DialogClose>
        </DialogHeader>
        <div className="flex">
          <div className="w-3/4 pt-2 px-6 pb-6 border-r border-gray-100">
            <div className="flex justify-end items-center gap-2 mb-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="rounded-full p-2 text-gray-300 cursor-not-allowed"
                      disabled
                    >
                      <Headphones className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 text-white border-0 text-xs">
                    Listen to transcript is a paid feature
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {isEditing ? (
                <div className="bg-white border border-gray-200 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-sm">
                  <span className="text-sm text-gray-600 font-medium">Editing</span>
                  <div className="flex gap-1 pl-2 border-l border-gray-200">
                    <button
                      onClick={handleSave}
                      className="rounded-full p-1.5 hover:bg-gray-100 transition-colors text-gray-500"
                      disabled={isSaving}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="rounded-full p-1.5 hover:bg-gray-100 transition-colors text-gray-500"
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleEditClick}
                  className="rounded-full p-2 hover:bg-gray-100 transition-colors text-gray-500"
                >
                  <Pencil className="h-5 w-5" />
                </button>
              )}
            </div>
            {error && (
              <div className="mb-4 p-4 text-sm text-red-600 bg-red-50 rounded-lg">
                {error}
              </div>
            )}
            <ScrollArea className="h-[60vh]">
              {isEditing ? (
                <Textarea
                  value={editedTranscript}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedTranscript(e.target.value)}
                  className="w-full min-h-[60vh] p-0 border-0 focus-visible:ring-0 resize-none"
                  placeholder="Enter interview transcript..."
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm text-gray-700 pr-6">
                  {interview.transcript}
                </div>
              )}
            </ScrollArea>
          </div>
          <div className="w-1/4 p-6">
            <div className="space-y-6 text-sm text-gray-600">
              <div>
                <div className="font-medium mb-2">Status</div>
                <Tag
                  variant={interview.status === "completed" ? "green" : "orange"}
                  size="sm"
                >
                  {interview.status}
                </Tag>
              </div>
              <div>
                <div className="font-medium mb-2">Source</div>
                <div>{interview.source}</div>
              </div>
              <div>
                <div className="font-medium mb-2">Created</div>
                <div>{format(new Date(interview.created_at), "PPP")}</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 