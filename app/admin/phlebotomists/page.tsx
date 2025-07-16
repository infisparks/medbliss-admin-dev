'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import FilterBar from '@/components/FilterBar'
import StatsCard from '@/components/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Eye, Star, UserCheck, TrendingUp, Calendar, Mail, Phone, MapPin, ClipboardCheck, Clock, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

// Define the Booking interface for collections within the phlebotomist details
interface PhleboBooking {
  id: string
  user_id: string
  service_title: string
  original_price: number
  discounted_price: number
  booking_date: string
  booking_time: string
  status: string
  created_at: string
  address: string
  user?: {
    full_name: string
    email: string
    phone: string
  }
}

interface Phlebotomist {
  uid: string
  email: string
  name: string
  approved: boolean
  created_at: string
  current_booking_id?: string | null // Can be null if no current booking
  total_collections?: number
  avg_rating?: number
  total_earnings?: number
  phone?: string // Assuming phlebo_detail might have a phone number
  address?: string // Assuming phlebo_detail might have an address
}

// --- PhlebotomistDetailsDialog Component ---
interface PhlebotomistDetailsDialogProps {
  phlebotomist: Phlebotomist
  isOpen: boolean // Added prop to control visibility
  onClose: () => void // Function to close the dialog
}

const PhlebotomistDetailsDialog: React.FC<PhlebotomistDetailsDialogProps> = ({ phlebotomist, isOpen, onClose }) => { // Destructure isOpen
  const [collections, setCollections] = useState<PhleboBooking[]>([])
  const [filteredCollections, setFilteredCollections] = useState<PhleboBooking[]>([])
  const [loadingCollections, setLoadingCollections] = useState(true)

  useEffect(() => {
    // Only fetch collections if the dialog is open and phlebotomist.uid is available
    if (isOpen && phlebotomist.uid) {
      fetchPhleboCollections()
    }
  }, [isOpen, phlebotomist.uid]) // Add isOpen to dependency array

  const fetchPhleboCollections = async () => {
    setLoadingCollections(true)
    try {
      const { data: bookingsData, error } = await supabase
        .from('user_bookings')
        .select(`
          *,
          profiles!user_id (
            full_name,
            email,
            phone
          )
        `)
        .eq('phlebo_uid', phlebotomist.uid)
        .order('booking_date', { ascending: false }) // Order by most recent booking date

      if (error) throw error

      const formattedBookings: PhleboBooking[] = (bookingsData || []).map(booking => ({
        id: booking.id,
        user_id: booking.user_id,
        service_title: booking.service_title,
        original_price: booking.original_price,
        discounted_price: booking.discounted_price,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        status: booking.status,
        created_at: booking.created_at,
        address: booking.address,
        user: booking.profiles
      }))

      setCollections(formattedBookings)
      setFilteredCollections(formattedBookings)
    } catch (error) {
      console.error('Error fetching phlebo collections:', error)
    } finally {
      setLoadingCollections(false)
    }
  }

  const handleDateFilterCollections = (filter: string) => {
    const now = new Date()
    let filtered = collections

    switch (filter) {
      case 'today':
        filtered = collections.filter(booking =>
          new Date(booking.booking_date).toDateString() === now.toDateString()
        )
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = collections.filter(booking => new Date(booking.booking_date) >= weekAgo)
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filtered = collections.filter(booking => new Date(booking.booking_date) >= monthAgo)
        break
      default:
        filtered = collections
    }
    setFilteredCollections(filtered)
  }

  const handleSearchCollections = (search: string) => {
    if (!search.trim()) {
      setFilteredCollections(collections)
    } else {
      const filtered = collections.filter(booking =>
        booking.service_title?.toLowerCase().includes(search.toLowerCase()) ||
        booking.user?.full_name?.toLowerCase().includes(search.toLowerCase())
      )
      setFilteredCollections(filtered)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'done':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'collected':
        return 'bg-purple-100 text-purple-800'
      case 'cancel':
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'notcollected':
        return 'bg-amber-100 text-amber-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    // Use the isOpen prop to control the Dialog's open state
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Details for {phlebotomist.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Personal Information</h3>
              <div className="space-y-2 text-gray-700">
                <div className="flex items-center"><User className="h-4 w-4 mr-2" /> <span>{phlebotomist.name}</span></div>
                <div className="flex items-center"><Mail className="h-4 w-4 mr-2" /> <span>{phlebotomist.email}</span></div>
                {phlebotomist.phone && <div className="flex items-center"><Phone className="h-4 w-4 mr-2" /> <span>{phlebotomist.phone}</span></div>}
                {phlebotomist.address && <div className="flex items-center"><MapPin className="h-4 w-4 mr-2" /> <span>{phlebotomist.address}</span></div>}
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Joined: {format(new Date(phlebotomist.created_at), 'MMM dd, yyyy')}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Performance & Status</h3>
              <div className="space-y-2 text-gray-700">
                <div className="flex items-center"><ClipboardCheck className="h-4 w-4 mr-2" /> <span>Total Collections: <b>{phlebotomist.total_collections || 0}</b></span></div>
                <div className="flex items-center"><Star className="h-4 w-4 mr-2 text-yellow-500" /> <span>Average Rating: <b>{phlebotomist.avg_rating?.toFixed(1) || 'N/A'}</b></span></div>
                <div className="flex items-center"><TrendingUp className="h-4 w-4 mr-2 text-green-700" /> <span>Total Earnings: <b>₹{phlebotomist.total_earnings || 0}</b></span></div>
                <div className="flex items-center">
                  <Badge variant={phlebotomist.approved ? 'default' : 'secondary'}>
                    {phlebotomist.approved ? 'Approved' : 'Pending Approval'}
                  </Badge>
                </div>
                {phlebotomist.current_booking_id && (
                  <div className="flex items-center text-blue-600 font-medium">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Currently on Booking: {phlebotomist.current_booking_id.slice(0, 8)}...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="font-semibold text-lg mb-4">Past Collections</h3>
            <FilterBar
              onDateFilter={handleDateFilterCollections}
              onSearch={handleSearchCollections}
              showStatus={false} // Status filter not needed for phlebo collections here
            />
            {loadingCollections ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredCollections.length === 0 ? (
              <p className="text-center text-gray-500 mt-4">No collections found for this phlebotomist within the selected filters.</p>
            ) : (
              <Card className="mt-4">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCollections.map((collection) => (
                        <TableRow key={collection.id}>
                          <TableCell>
                            <div className="font-medium">{collection.user?.full_name || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{collection.user?.email}</div>
                          </TableCell>
                          <TableCell>{collection.service_title}</TableCell>
                          <TableCell>
                            {format(new Date(collection.booking_date), 'MMM dd, yyyy')} at {collection.booking_time}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(collection.status)}>
                              {collection.status}
                            </Badge>
                          </TableCell>
                          <TableCell>₹{collection.discounted_price}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
          {/* --- Explicit Close Button --- */}
          <div className="flex justify-end mt-6">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
          {/* --- End Explicit Close Button --- */}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- Main PhlebotomistsPage Component ---
export default function PhlebotomistsPage() {
  const [phlebotomists, setPhlebotomists] = useState<Phlebotomist[]>([])
  const [filteredPhlebotomists, setFilteredPhlebotomists] = useState<Phlebotomist[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhlebotomist, setSelectedPhlebotomist] = useState<Phlebotomist | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false) // State for dialog visibility

  const [stats, setStats] = useState({
    totalPhlebotomists: 0,
    approvedPhlebotomists: 0,
    totalCollections: 0,
    avgRating: 0
  })

  useEffect(() => {
    fetchPhlebotomists()
  }, [])

  const fetchPhlebotomists = async () => {
    try {
      const { data: phlebotomistsData, error } = await supabase
        .from('phlebo_detail')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get booking stats for each phlebotomist
      const enrichedData = await Promise.all(
        (phlebotomistsData || []).map(async (phlebo) => {
          const { data: bookings } = await supabase
            .from('user_bookings')
            .select('id, rating, discounted_price') // Select only necessary fields for stats
            .eq('phlebo_uid', phlebo.uid)

          const totalCollections = bookings?.length || 0
          const avgRating = bookings && bookings.length > 0
            ? bookings.reduce((sum, booking) => sum + (booking.rating || 0), 0) / bookings.length
            : 0
          const totalEarnings = bookings?.reduce((sum, booking) => sum + (booking.discounted_price || 0), 0) || 0

          return {
            ...phlebo,
            total_collections: totalCollections,
            avg_rating: parseFloat(avgRating.toFixed(1)), // Ensure formatted to 1 decimal
            total_earnings: totalEarnings
          }
        })
      )

      setPhlebotomists(enrichedData)
      setFilteredPhlebotomists(enrichedData)

      // Calculate overall stats
      const totalPhlebotomists = enrichedData.length
      const approvedPhlebotomists = enrichedData.filter(p => p.approved).length
      const overallTotalCollections = enrichedData.reduce((sum, p) => sum + (p.total_collections || 0), 0)
      // Calculate overall average rating considering only phlebotomists with at least one rating
      const phlebosWithRatings = enrichedData.filter(p => p.avg_rating !== undefined && p.avg_rating > 0);
      const overallAvgRating = phlebosWithRatings.length > 0
          ? phlebosWithRatings.reduce((sum, p) => sum + (p.avg_rating || 0), 0) / phlebosWithRatings.length
          : 0;


      setStats({
        totalPhlebotomists,
        approvedPhlebotomists,
        totalCollections: overallTotalCollections,
        avgRating: parseFloat(overallAvgRating.toFixed(1))
      })
    } catch (error) {
      console.error('Error fetching phlebotomists:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = (filter: string) => {
    const now = new Date()
    let filtered = phlebotomists

    switch (filter) {
      case 'today':
        filtered = phlebotomists.filter(phlebo =>
          new Date(phlebo.created_at).toDateString() === now.toDateString()
        )
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = phlebotomists.filter(phlebo => new Date(phlebo.created_at) >= weekAgo)
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filtered = phlebotomists.filter(phlebo => new Date(phlebo.created_at) >= monthAgo)
        break
      default:
        filtered = phlebotomists
    }

    setFilteredPhlebotomists(filtered)
  }

  const handleSearch = (search: string) => {
    if (!search.trim()) {
      setFilteredPhlebotomists(phlebotomists)
    } else {
      const filtered = phlebotomists.filter(phlebo =>
        phlebo.name?.toLowerCase().includes(search.toLowerCase()) ||
        phlebo.email?.toLowerCase().includes(search.toLowerCase())
      )
      setFilteredPhlebotomists(filtered)
    }
  }

  const handleViewDetails = (phlebo: Phlebotomist) => {
    setSelectedPhlebotomist(phlebo)
    setIsDetailsDialogOpen(true) // Open the dialog
  }

  const handleCloseDetailsDialog = () => {
    setIsDetailsDialogOpen(false) // Close the dialog
    setSelectedPhlebotomist(null) // Clear selected phlebotomist when closed
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
          <h1 className="text-3xl font-bold text-gray-900">Phlebotomists Management</h1>
          <Badge variant="outline" className="text-lg px-4 py-2">
            Total: {filteredPhlebotomists.length}
          </Badge>
        </div>

        <FilterBar onDateFilter={handleDateFilter} onSearch={handleSearch} />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Phlebotomists"
            value={stats.totalPhlebotomists}
            icon={<UserCheck className="h-6 w-6" />}
            color="blue"
          />
          <StatsCard
            title="Approved"
            value={stats.approvedPhlebotomists}
            icon={<TrendingUp className="h-6 w-6" />}
            color="green"
          />
          <StatsCard
            title="Total Collections"
            value={stats.totalCollections}
            icon={<Calendar className="h-6 w-6" />}
            color="yellow"
          />
          <StatsCard
            title="Average Rating"
            value={stats.avgRating.toFixed(1)}
            icon={<Star className="h-6 w-6" />}
            color="yellow"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Phlebotomist List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phlebotomist</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Collections</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPhlebotomists.map((phlebo) => (
                  <TableRow key={phlebo.uid}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {phlebo.name?.split(' ').map(n => n[0]).join('') || 'P'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{phlebo.name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">ID: {phlebo.uid.slice(0, 8)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{phlebo.email}</TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="text-lg font-semibold">{phlebo.total_collections || 0}</div>
                        <div className="text-sm text-gray-500">samples</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center"> {/* Centered content */}
                        <Star className="h-4 w-4 text-yellow-400 mr-1" />
                        <span>{phlebo.avg_rating?.toFixed(1) || '0.0'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="text-lg font-semibold">₹{phlebo.total_earnings || 0}</div>
                        <div className="text-sm text-gray-500">earned</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={phlebo.approved ? 'default' : 'secondary'}>
                        {phlebo.approved ? 'Approved' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(phlebo.created_at), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(phlebo)}>
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

        {/* Phlebotomist Details Dialog */}
        {selectedPhlebotomist && (
          <PhlebotomistDetailsDialog
            phlebotomist={selectedPhlebotomist}
            isOpen={isDetailsDialogOpen} // Pass the dialog open state
            onClose={handleCloseDetailsDialog} // Pass the close handler
          />
        )}
      </div>
    </DashboardLayout>
  )
}