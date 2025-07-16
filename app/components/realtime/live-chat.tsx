
'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useWebSocket } from './websocket-provider'
import { Send, Paperclip, Smile, MoreVertical, Phone, Video } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'

interface LiveChatProps {
  roomId: string
  roomType?: string
  className?: string
}

export default function LiveChat({ roomId, roomType = 'general', className }: LiveChatProps) {
  const { data: session } = useSession()
  const { socket, isConnected, joinRoom, leaveRoom } = useWebSocket()
  const { toast } = useToast()
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [participants, setParticipants] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (roomId && isConnected) {
      joinRoom(roomId, roomType)
      loadMessages()
    }

    return () => {
      if (roomId) {
        leaveRoom(roomId)
      }
    }
  }, [roomId, roomType, isConnected, joinRoom, leaveRoom])

  useEffect(() => {
    if (socket) {
      socket.on('new_message', handleNewMessage)
      socket.on('message_read', handleMessageRead)
      socket.on('user_joined_room', handleUserJoined)
      socket.on('user_left_room', handleUserLeft)
      socket.on('messages_read', handleMessagesRead)

      return () => {
        socket.off('new_message', handleNewMessage)
        socket.off('message_read', handleMessageRead)
        socket.off('user_joined_room', handleUserJoined)
        socket.off('user_left_room', handleUserLeft)
        socket.off('messages_read', handleMessagesRead)
      }
    }
  }, [socket])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/realtime/chat/${roomId}?limit=50`)
      const data = await response.json()

      if (response.ok) {
        setMessages(data.messages.reverse()) // Reverse to show oldest first
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load messages',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNewMessage = (message: any) => {
    if (message.roomId === roomId) {
      setMessages(prev => [...prev, message])
    }
  }

  const handleMessageRead = (data: any) => {
    setMessages(prev => prev.map(msg => 
      msg.id === data.messageId ? { ...msg, isRead: true, readAt: data.readAt } : msg
    ))
  }

  const handleUserJoined = (data: any) => {
    setParticipants(prev => [...prev, data])
  }

  const handleUserLeft = (data: any) => {
    setParticipants(prev => prev.filter(p => p.userId !== data.userId))
  }

  const handleMessagesRead = (data: any) => {
    setMessages(prev => prev.map(msg => 
      msg.senderId !== session?.user?.id ? { ...msg, isRead: true, readAt: data.readAt } : msg
    ))
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const response = await fetch(`/api/realtime/chat/${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          messageType: 'text'
        })
      })

      if (response.ok) {
        setNewMessage('')
      } else {
        toast({
          title: 'Error',
          description: 'Failed to send message',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      })
    } finally {
      setSending(false)
    }
  }

  const markAsRead = async () => {
    try {
      await fetch(`/api/realtime/chat/${roomId}/read`, {
        method: 'POST'
      })
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!session?.user?.id) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            💬 Chat
            {!isConnected && (
              <Badge variant="destructive" className="text-xs">
                Offline
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Video className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={markAsRead}>
                  Mark all as read
                </DropdownMenuItem>
                <DropdownMenuItem onClick={loadMessages}>
                  Refresh messages
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col h-96">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No messages yet. Start the conversation!
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isOwn = message.senderId === session.user.id
                  const showAvatar = !isOwn

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      {showAvatar && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={message.senderAvatar} />
                          <AvatarFallback>
                            {message.senderName?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-xs ${isOwn ? 'order-1' : 'order-2'}`}>
                        <div
                          className={`p-3 rounded-lg ${
                            isOwn
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {!isOwn && (
                            <p className="text-xs font-medium mb-1">
                              {message.senderName}
                            </p>
                          )}
                          <p className="text-sm">{message.message}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs opacity-70">
                              {formatTime(message.createdAt)}
                            </p>
                            {isOwn && (
                              <div className="flex items-center gap-1">
                                {message.isRead && (
                                  <span className="text-xs opacity-70">✓✓</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          <Separator />

          {/* Message Input */}
          <div className="p-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Paperclip className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  disabled={!isConnected || sending}
                />
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Smile className="h-4 w-4" />
              </Button>
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || !isConnected || sending}
                size="sm"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

