'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import FilterBar from '@/components/FilterBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Eye, FlaskConical, Calendar, MapPin, Phone, User, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

interface TestSample {
  id: string
  user_id: string
  service_title: string
  booking_date: string
  booking_time: string
  status: string
  created_at: string
  address: string
  rating?: number
  phlebo_uid?: string
  user?: {
    full_name: string
    email: string
    phone: string
  }
  phlebo?: {
    name: string
    email: string
  }
}

export default function TestsPage() {
  const [samples, setSamples] = useState<TestSample[]>([])
  const [filteredSamples, setFilteredSamples] = useState<TestSample[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSample, setSelectedSample] = useState<TestSample | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    fetchSamples()
  }, [])

  const fetchSamples = async () => {
    try {
      const { data: userBookings, error } = await supabase
        .from('user_bookings')
        .select(`
          *,
          profiles!user_id (
            full_name,
            email,
            phone
          ),
          phlebo_detail (
            name,
            email
          )
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (error) throw error

      const samplesData = (userBookings || []).map(booking => ({
        ...booking,
        user: booking.profiles,
        phlebo: booking.phlebo_detail
      }))

      setSamples(samplesData)
      setFilteredSamples(samplesData)
    } catch (error) {
      console.error('Error fetching test samples:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = (filter: string) => {
    const now = new Date()
    let filtered = samples

    switch (filter) {
      case 'today':
        filtered = samples.filter(sample => 
          new Date(sample.booking_date).toDateString() === now.toDateString()
        )
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = samples.filter(sample => new Date(sample.booking_date) >= weekAgo)
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filtered = samples.filter(sample => new Date(sample.booking_date) >= monthAgo)
        break
      default:
        filtered = samples
    }

    setFilteredSamples(filtered)
  }

  const handleSearch = (search: string) => {
    const filtered = samples.filter(sample =>
      sample.service_title?.toLowerCase().includes(search.toLowerCase()) ||
      sample.user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      sample.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      sample.phlebo?.name?.toLowerCase().includes(search.toLowerCase())
    )
    setFilteredSamples(filtered)
  }

  const handleViewDetails = (sample: TestSample) => {
    setSelectedSample(sample)
    setIsDialogOpen(true)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Collected Test Samples</h1>
          <Badge variant="outline" className="text-lg px-4 py-2">
            Total: {filteredSamples.length}
          </Badge>
        </div>

        <FilterBar onDateFilter={handleDateFilter} onSearch={handleSearch} />

        <Card>
          <CardHeader>
            <CardTitle>Sample Collection List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Phlebotomist</TableHead>
                  <TableHead>Collection Date</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSamples.map((sample) => (
                  <TableRow key={sample.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {sample.user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{sample.user?.full_name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{sample.user?.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <FlaskConical className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-medium">{sample.service_title}</div>
                          <div className="text-sm text-gray-500">{sample.booking_time}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{sample.phlebo?.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{sample.phlebo?.email || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-blue-600 mr-1" />
                        <span className="text-sm">
                          {format(new Date(sample.booking_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {sample.rating ? (
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 mr-1" />
                          <span>{sample.rating}/5</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">No rating</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">
                        Completed
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(sample)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Sample Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Sample Collection Details</DialogTitle>
            </DialogHeader>
            {selectedSample && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Patient Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        <span>{selectedSample.user?.full_name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2" />
                        <span>{selectedSample.user?.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span className="text-sm">{selectedSample.address}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Collection Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{format(new Date(selectedSample.booking_date), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center">
                        <FlaskConical className="h-4 w-4 mr-2" />
                        <span>{selectedSample.booking_time}</span>
                      </div>
                      <div>
                        <Badge className="bg-green-100 text-green-800">
                          Sample Collected
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Test Details</h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="font-medium">{selectedSample.service_title}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Collected on: {format(new Date(selectedSample.created_at), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                </div>

                {selectedSample.phlebo && (
                  <div>
                    <h3 className="font-semibold mb-2">Phlebotomist</h3>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="font-medium">{selectedSample.phlebo.name}</div>
                      <div className="text-sm text-gray-600">{selectedSample.phlebo.email}</div>
                    </div>
                  </div>
                )}

                {selectedSample.rating && (
                  <div>
                    <h3 className="font-semibold mb-2">Service Rating</h3>
                    <div className="flex items-center">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} className={`text-2xl ${i < selectedSample.rating! ? 'text-yellow-400' : 'text-gray-300'}`}>
                          ★
                        </span>
                      ))}
                      <span className="ml-2 text-lg">{selectedSample.rating}/5</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}