
'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Send, 
  Paperclip, 
  Mic, 
  Phone, 
  Video, 
  MapPin, 
  Clock,
  MessageCircle,
  MoreVertical
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  senderId: string
  receiverId: string
  message?: string
  messageType: 'TEXT' | 'IMAGE' | 'VOICE' | 'LOCATION' | 'SYSTEM' | 'QUICK_REPLY'
  attachmentUrl?: string
  voiceDuration?: number
  locationLat?: number
  locationLng?: number
  locationAddress?: string
  isRead: boolean
  createdAt: string
  sender: {
    id: string
    name: string
    avatar?: string
    role: string
  }
}

interface RideChatProps {
  rideId: string
  otherUserId: string
  otherUser: {
    id: string
    name: string
    avatar?: string
    role: string
  }
  onInitiateCall?: (type: 'VOICE' | 'VIDEO') => void
}

export default function RideChat({ rideId, otherUserId, otherUser, onInitiateCall }: RideChatProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [quickReplies, setQuickReplies] = useState<any[]>([])
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchMessages()
    fetchQuickReplies()
  }, [rideId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/ride-experience/chat?rideId=${rideId}`)
      const data = await response.json()
      
      if (data.success) {
        setMessages(data.data)
        // Mark messages as read
        await markAsRead()
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const fetchQuickReplies = async () => {
    try {
      const response = await fetch('/api/ride-experience/chat/quick-replies')
      const data = await response.json()
      
      if (data.success) {
        setQuickReplies(data.data)
      }
    } catch (error) {
      console.error('Error fetching quick replies:', error)
    }
  }

  const markAsRead = async () => {
    try {
      await fetch('/api/ride-experience/chat/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rideId }),
      })
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const sendMessage = async (messageText: string, quickReplyId?: string) => {
    if (!messageText.trim() || isLoading) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/ride-experience/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rideId,
          receiverId: otherUserId,
          message: messageText,
          messageType: 'TEXT',
          quickReplyId,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setMessages(prev => [...prev, data.data])
        setNewMessage('')
        setShowQuickReplies(false)
        inputRef.current?.focus()
      } else {
        toast.error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(newMessage)
  }

  const handleQuickReply = (reply: any) => {
    sendMessage(reply.text, reply.id)
  }

  const formatMessageTime = (createdAt: string) => {
    const date = new Date(createdAt)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return format(date, 'HH:mm')
    } else {
      return format(date, 'MMM d, HH:mm')
    }
  }

  const renderMessage = (message: Message) => {
    const isOwn = message.senderId === session?.user?.id
    const showAvatar = !isOwn

    return (
      <div
        key={message.id}
        className={cn(
          'flex gap-3 mb-4',
          isOwn ? 'justify-end' : 'justify-start'
        )}
      >
        {showAvatar && (
          <Avatar className="h-8 w-8">
            <AvatarImage src={message.sender.avatar} />
            <AvatarFallback>
              {message.sender.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={cn(
          'max-w-[70%] flex flex-col',
          isOwn ? 'items-end' : 'items-start'
        )}>
          <div className={cn(
            'px-4 py-2 rounded-lg',
            isOwn 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-900'
          )}>
            {message.messageType === 'TEXT' && (
              <p className="text-sm">{message.message}</p>
            )}
            {message.messageType === 'LOCATION' && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{message.locationAddress || 'Location shared'}</span>
              </div>
            )}
            {message.messageType === 'VOICE' && (
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                <span className="text-sm">Voice message ({message.voiceDuration}s)</span>
              </div>
            )}
            {message.messageType === 'SYSTEM' && (
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm italic">{message.message}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">
              {formatMessageTime(message.createdAt)}
            </span>
            {isOwn && (
              <span className="text-xs text-gray-500">
                {message.isRead ? 'Read' : 'Sent'}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherUser.avatar} />
              <AvatarFallback>
                {otherUser.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{otherUser.name}</h3>
              <p className="text-sm text-gray-500 capitalize">{otherUser.role}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onInitiateCall?.('VOICE')}
              className="text-gray-500 hover:text-gray-700"
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onInitiateCall?.('VIDEO')}
              className="text-gray-500 hover:text-gray-700"
            >
              <Video className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <Separator />
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Start a conversation with {otherUser.name}</p>
            </div>
          ) : (
            <div>
              {messages.map(renderMessage)}
              <div ref={messagesEndRef} />
            </div>
          )}
          
          {isTyping && (
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
              <span>{otherUser.name} is typing...</span>
            </div>
          )}
        </ScrollArea>
        
        {showQuickReplies && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((reply) => (
                <Button
                  key={reply.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickReply(reply)}
                  className="text-xs"
                >
                  {reply.text}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        <div className="p-4 border-t bg-white">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowQuickReplies(!showQuickReplies)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Clock className="h-4 w-4" />
            </Button>
            
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="pr-20"
                disabled={isLoading}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={!newMessage.trim() || isLoading}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
