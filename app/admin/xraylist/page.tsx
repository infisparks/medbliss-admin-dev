'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Eye, MapPin, Calendar, Clock, StickyNote, DollarSign } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format, isToday, isThisWeek, isThisMonth, isSameDay, parseISO } from 'date-fns'
import FilterBar from '@/components/FilterBar'

interface XrayBookingRow {
  id: string;
  user_id: string;
  xray_service_id: string;
  patient_details: any;
  booking_date: string;
  booking_time: string;
  booking_address: string;
  latitude?: number;
  longitude?: number;
  otp: number;
  status: string;
  payment_status: string;
  report_delivery_method?: string;
  additional_notes?: string;
  original_price: number;
  discounted_price: number;
  created_at: string;
  cancelled_at?: string;
  cancel_reason?: string;
  rating?: number;
  has_rated?: boolean;
  phone_number?: string;
  profiles: {
    full_name: string;
    phone: string;
  } | null;
  xray_services: {
    service_name: string;
  } | null;
}

export default function XrayBookingsListPage() {
  const [bookings, setBookings] = useState<XrayBookingRow[]>([])
  const [filteredBookings, setFilteredBookings] = useState<XrayBookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<XrayBookingRow | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [customDate, setCustomDate] = useState<Date | null>(null)

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('xray_bookings')
        .select(`*, profiles(full_name, phone), xray_services(service_name)`)
        .order('created_at', { ascending: false })
      if (error) throw error
      setBookings(data || [])
      setFilteredBookings(data || [])
    } catch (error) {
      console.error('Error fetching xray bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = (filter: string) => {
    let filtered = bookings
    if (filter === 'today') {
      filtered = bookings.filter(b => isToday(parseISO(b.booking_date)))
      setCustomDate(null)
    } else if (filter === 'thisWeek') {
      filtered = bookings.filter(b => isThisWeek(parseISO(b.booking_date), { weekStartsOn: 1 }))
      setCustomDate(null)
    } else if (filter === 'thisMonth') {
      filtered = bookings.filter(b => isThisMonth(parseISO(b.booking_date)))
      setCustomDate(null)
    } else {
      filtered = bookings
      setCustomDate(null)
    }
    setFilteredBookings(filtered)
  }

  const handleSearch = (search: string) => {
    const lower = search.toLowerCase()
    setFilteredBookings(bookings.filter(b =>
      (b.profiles?.full_name?.toLowerCase().includes(lower) ||
        b.phone_number?.toLowerCase().includes(lower) ||
        b.profiles?.phone?.toLowerCase().includes(lower) ||
        b.xray_services?.service_name?.toLowerCase().includes(lower))
    ))
  }

  const handleCustomDate = (date: Date) => {
    setCustomDate(date)
    setFilteredBookings(bookings.filter(b => isSameDay(parseISO(b.booking_date), date)))
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
          <h1 className="text-3xl font-bold text-gray-900">X-Ray Bookings</h1>
          <Badge variant="outline" className="text-lg px-4 py-2">
            Total: {filteredBookings.length}
          </Badge>
        </div>
        <FilterBar onDateFilter={handleDateFilter} onSearch={handleSearch} />
        <div className="mb-4">
          <label className="mr-2 font-medium">Custom Date:</label>
          <input
            type="date"
            value={customDate ? format(customDate, 'yyyy-MM-dd') : ''}
            onChange={e => {
              if (e.target.value) handleCustomDate(new Date(e.target.value))
            }}
            className="border rounded px-2 py-1"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Booking List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Name</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>View Location</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.profiles?.full_name || 'N/A'}</TableCell>
                    <TableCell>{booking.phone_number || booking.profiles?.phone || 'N/A'}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelectedBooking(booking); setIsDialogOpen(true); }}
                      >
                        <MapPin className="h-4 w-4 mr-1" /> View
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-blue-600 mr-1" />
                        <span className="text-sm">{format(new Date(booking.booking_date), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center mt-1">
                        <Clock className="h-4 w-4 text-gray-600 mr-1" />
                        <span className="text-sm">{booking.booking_time}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {booking.additional_notes ? (
                        <span className="flex items-center"><StickyNote className="h-4 w-4 mr-1 text-yellow-600" />{booking.additional_notes}</span>
                      ) : (
                        <span className="text-gray-400">No Note</span>
                      )}
                    </TableCell>
                    <TableCell>{booking.xray_services?.service_name || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-semibold">₹{booking.discounted_price}</div>
                        {booking.original_price !== booking.discounted_price && (
                          <div className="text-sm text-gray-500 line-through">₹{booking.original_price}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => { setSelectedBooking(booking); setIsDialogOpen(true); }}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {/* Location Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Booking Location</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-blue-700" />
                  <span className="font-medium">{selectedBooking.booking_address || 'N/A'}</span>
                </div>
                {selectedBooking.latitude && selectedBooking.longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${selectedBooking.latitude},${selectedBooking.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Open in Google Maps
                  </a>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
