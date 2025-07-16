'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import FilterBar from '@/components/FilterBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Eye, Calendar, MapPin, Phone, Clock, User, AlertCircle, Package, Truck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

// Define interfaces for direct Supabase query results
// This helps TypeScript understand the structure *before* you map them to your `Booking` interface
interface UserBookingRow {
  id: string;
  user_id: string;
  service_title: string;
  original_price: number;
  discounted_price: number;
  booking_date: string;
  booking_time: string;
  status: string;
  created_at: string;
  cancelled_at?: string;
  cancel_reason?: string;
  address: string;
  rating?: number;
  phlebo_uid?: string;
  phlebo_assigned_at?: string;
  profiles: {
    full_name: string;
    email: string;
    phone: string;
  } | null; // profiles can be null if not found
  phlebo_detail: { // This will be the result of the direct join
    name: string;
    email: string;
  } | null; // phlebo_detail can be null if not assigned
}

interface SonographyBookingRow {
  id: string;
  user_id: string;
  // Assuming sonography bookings might have their own price fields
  original_price?: number; // Made optional as it might not be present
  discounted_price?: number; // Made optional
  booking_date: string;
  booking_time: string;
  status: string;
  created_at: string;
  cancelled_at?: string;
  cancel_reason?: string;
  address: string; // Base address
  booking_address?: string; // Specific booking address
  rating?: number;
  profiles: {
    full_name: string;
    email: string;
    phone: string;
  } | null;
  sonography_services: {
    service_name: string;
  } | null;
}

interface XrayBookingRow {
  id: string;
  user_id: string;
  // Assuming xray bookings might have their own price fields
  original_price?: number; // Made optional
  discounted_price?: number; // Made optional
  booking_date: string;
  booking_time: string;
  status: string;
  created_at: string;
  cancelled_at?: string;
  cancel_reason?: string;
  address: string; // Base address
  booking_address?: string; // Specific booking address
  rating?: number;
  profiles: {
    full_name: string;
    email: string;
    phone: string;
  } | null;
  xray_services: {
    service_name: string;
  } | null;
}


// Your existing Booking interface (the canonical one for the component state)
interface Booking {
  id: string
  user_id: string
  service_title: string // Dynamically set for sonography/xray
  original_price: number
  discounted_price: number
  booking_date: string
  booking_time: string
  status: string
  created_at: string
  cancelled_at?: string
  cancel_reason?: string
  address: string
  rating?: number
  user?: {
    full_name: string
    email: string
    phone: string
  }
  phlebo?: {
    name: string
    email: string
  }
  phlebo_uid?: string
  phlebo_assigned_at?: string
  booking_address?: string // For sonography/xray original column
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    setLoading(true);
    try {
      // Fetch user bookings (blood tests)
      const { data: userBookings, error: userError } = (await supabase
        .from('user_bookings')
        .select(`
          *,
          profiles(full_name, email, phone),
          phlebo_detail(name, email)
        `)) as { data: UserBookingRow[] | null, error: any };


      if (userError) throw userError;

      // Fetch sonography bookings
      const { data: sonographyBookings, error: sonographyError } = (await supabase
        .from('sonography_bookings')
        .select(`
          *,
          profiles(full_name, email, phone),
          sonography_services(service_name)
        `)) as { data: SonographyBookingRow[] | null, error: any };

      if (sonographyError) throw sonographyError;

      // Fetch x-ray bookings
      const { data: xrayBookings, error: xrayError } = (await supabase
        .from('xray_bookings')
        .select(`
          *,
          profiles(full_name, email, phone),
          xray_services(service_name)
        `)) as { data: XrayBookingRow[] | null, error: any };

      if (xrayError) throw xrayError;

      let allBookings: Booking[] = []

      // Process user bookings (blood tests)
      for (const booking of userBookings || []) {
        allBookings.push({
          ...booking, // Spread existing properties
          user: booking.profiles || undefined, // Ensure it's undefined if null
          phlebo: booking.phlebo_detail || undefined, // Use the directly joined phlebo_detail
        });
      }

      // Process sonography bookings
      for (const booking of sonographyBookings || []) {
        allBookings.push({
          ...booking,
          service_title: booking.sonography_services?.service_name || 'Sonography Service',
          user: booking.profiles || undefined,
          // Use booking_address if present, otherwise fallback to original 'address'
          address: booking.booking_address || booking.address,
          original_price: booking.original_price ?? 0, // Use nullish coalescing for default 0
          discounted_price: booking.discounted_price ?? 0, // Use nullish coalescing for default 0
          phlebo: undefined, // No phlebo for sonography
          phlebo_uid: undefined,
          phlebo_assigned_at: undefined
        })
      }

      // Process x-ray bookings
      for (const booking of xrayBookings || []) {
        allBookings.push({
          ...booking,
          service_title: booking.xray_services?.service_name || 'X-Ray Service',
          user: booking.profiles || undefined,
          // Use booking_address if present, otherwise fallback to original 'address'
          address: booking.booking_address || booking.address,
          original_price: booking.original_price ?? 0, // Use nullish coalescing for default 0
          discounted_price: booking.discounted_price ?? 0, // Use nullish coalescing for default 0
          phlebo: undefined, // No phlebo for X-Ray
          phlebo_uid: undefined,
          phlebo_assigned_at: undefined
        })
      }

      // Sort all bookings by creation date
      allBookings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setBookings(allBookings);
      setFilteredBookings(allBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDateFilter = (filter: string) => {
    const now = new Date()
    let filtered = bookings

    switch (filter) {
      case 'today':
        filtered = bookings.filter(booking =>
          new Date(booking.booking_date).toDateString() === now.toDateString()
        )
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = bookings.filter(booking => new Date(booking.booking_date) >= weekAgo)
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filtered = bookings.filter(booking => new Date(booking.booking_date) >= monthAgo)
        break
      default:
        filtered = bookings
    }

    setFilteredBookings(filtered)
  }

  const handleSearch = (search: string) => {
    const lowercasedSearch = search.toLowerCase();
    const filtered = bookings.filter(booking =>
      booking.service_title?.toLowerCase().includes(lowercasedSearch) ||
      booking.user?.full_name?.toLowerCase().includes(lowercasedSearch) ||
      booking.user?.email?.toLowerCase().includes(lowercasedSearch) ||
      booking.phlebo?.name?.toLowerCase().includes(lowercasedSearch) ||
      booking.phlebo?.email?.toLowerCase().includes(lowercasedSearch)
    )
    setFilteredBookings(filtered)
  }

  const handleStatusFilter = (status: string) => {
    if (status === 'all') {
      setFilteredBookings(bookings)
    } else {
      const filtered = bookings.filter(booking =>
        booking.status.toLowerCase() === status.toLowerCase()
      )
      setFilteredBookings(filtered)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-orange-100 text-orange-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'collected':
        return 'bg-purple-100 text-purple-800'
      case 'done':
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'notcollected':
        return 'bg-amber-100 text-amber-800'
      case 'cancel':
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'otp':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking)
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
          <h1 className="text-3xl font-bold text-gray-900">Bookings Management</h1>
          <Badge variant="outline" className="text-lg px-4 py-2">
            Total: {filteredBookings.length}
          </Badge>
        </div>

        <FilterBar
          onDateFilter={handleDateFilter}
          onSearch={handleSearch}
          onStatusFilter={handleStatusFilter}
          showStatus={true}
        />

        <Card>
          <CardHeader>
            <CardTitle>Booking List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Phlebo</TableHead>
                  <TableHead>Booking Date</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {booking.user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{booking.user?.full_name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{booking.user?.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{booking.service_title}</div>
                        <div className="text-sm text-gray-500">
                          {booking.address?.substring(0, 30)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {booking.phlebo ? (
                        <div>
                          <div className="font-medium">{booking.phlebo.name}</div>
                          <div className="text-sm text-gray-500">{booking.phlebo.email}</div>
                          <Badge variant="secondary" className="mt-1">Assigned</Badge>
                        </div>
                      ) : (
                        <Badge variant="outline">Not Assigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-blue-600 mr-1" />
                        <span className="text-sm">
                          {format(new Date(booking.booking_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center mt-1">
                        <Clock className="h-4 w-4 text-gray-600 mr-1" />
                        <span className="text-sm">
                          {booking.booking_time}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-semibold">₹{booking.discounted_price}</div>
                        {booking.original_price !== booking.discounted_price && (
                          <div className="text-sm text-gray-500 line-through">
                            ₹{booking.original_price}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                      {(booking.status.toLowerCase() === 'cancel' || booking.status.toLowerCase() === 'cancelled') && booking.cancel_reason && (
                        <div className="flex items-center mt-1 text-red-600">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          <span className="text-xs">Has reason</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(booking.created_at), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(booking)}>
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

        {/* Booking Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Customer Information</h3>
                    <div className="space-y-2 text-gray-700 text-sm">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        <span>{selectedBooking.user?.full_name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2" />
                        <span>{selectedBooking.user?.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 mr-2 mt-1" />
                        <span className="break-words">{selectedBooking.address || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Booking Information</h3>
                    <div className="space-y-2 text-gray-700 text-sm">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{format(new Date(selectedBooking.booking_date), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>{selectedBooking.booking_time}</span>
                      </div>
                      <div>
                        <Badge className={getStatusColor(selectedBooking.status)}>
                          {selectedBooking.status}
                        </Badge>
                      </div>
                      <div className="flex items-center mt-2">
                        <Package className="h-4 w-4 mr-2" />
                        <span className="font-medium">{selectedBooking.service_title}</span>
                      </div>
                      <div className="flex items-center mt-1">
                        <span className="text-gray-600">Price: </span>
                        <span className="font-semibold ml-1">₹{selectedBooking.discounted_price}</span>
                        {selectedBooking.original_price !== selectedBooking.discounted_price && (
                          <span className="ml-2 text-gray-500 line-through">₹{selectedBooking.original_price}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedBooking.phlebo && selectedBooking.phlebo_uid && (
                  <div>
                    <h3 className="font-semibold mb-2">Assigned Phlebotomist</h3>
                    <div className="p-4 bg-blue-50 rounded-lg flex items-center">
                      <Truck className="h-5 w-5 mr-3 text-blue-700" />
                      <div>
                        <div className="font-medium">{selectedBooking.phlebo.name}</div>
                        <div className="text-sm text-gray-600">{selectedBooking.phlebo.email}</div>
                        {selectedBooking.phlebo_assigned_at && (
                          <div className="text-xs text-gray-500 mt-1">
                            Assigned on: {format(new Date(selectedBooking.phlebo_assigned_at), 'MMM dd, yyyy HH:mm')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {(selectedBooking.status.toLowerCase() === 'cancel' || selectedBooking.status.toLowerCase() === 'cancelled') && selectedBooking.cancel_reason && (
                  <div>
                    <h3 className="font-semibold mb-2 text-red-600">Cancellation Reason</h3>
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-red-800">{selectedBooking.cancel_reason}</div>
                      {selectedBooking.cancelled_at && (
                        <div className="text-sm text-red-600 mt-1">
                          Cancelled on: {format(new Date(selectedBooking.cancelled_at), 'MMM dd, yyyy HH:mm')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedBooking.status.toLowerCase() === 'notcollected' && selectedBooking.cancel_reason && (
                  <div>
                    <h3 className="font-semibold mb-2 text-amber-600">Not Collected Reason</h3>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="text-amber-800">{selectedBooking.cancel_reason}</div>
                    </div>
                  </div>
                )}


                {selectedBooking.rating !== undefined && selectedBooking.rating !== null && (
                  <div>
                    <h3 className="font-semibold mb-2">Rating</h3>
                    <div className="flex items-center">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} className={`text-2xl ${i < selectedBooking.rating! ? 'text-yellow-400' : 'text-gray-300'}`}>
                          ★
                        </span>
                      ))}
                      <span className="ml-2 text-lg">{selectedBooking.rating}/5</span>
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