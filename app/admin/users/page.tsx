'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import FilterBar from '@/components/FilterBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Eye, Phone, Mail, MapPin, Calendar, Clock, DollarSign, Package, FileText, ShoppingBag } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog' // Keep Dialog imports here
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

// User Interface
interface User {
  id: string
  email: string
  full_name: string
  phone: string
  age: number
  gender: string
  address: string
  created_at: string
  type: string
}

// User Booking Interface (for the dialog)
interface UserBooking {
  id: string
  service_title: string
  original_price: number
  discounted_price: number
  booking_date: string
  booking_time: string
  status: string
  created_at: string
  address: string
  phlebo_uid?: string
  phlebo_detail?: {
    name: string
  }
  booked_for_members?: string | any[]
  member?: {
    id?: string
    name?: string
    phone?: string
    age?: number
    gender?: string
  } | null
}

// --- UserDetailsDialog Component (now inline) ---
interface UserDetailsDialogProps {
  user: User
  isOpen: boolean
  onClose: () => void
}

const UserDetailsDialog: React.FC<UserDetailsDialogProps> = ({ user, isOpen, onClose }) => {
  const [bookings, setBookings] = useState<UserBooking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<UserBooking[]>([])
  const [loadingBookings, setLoadingBookings] = useState(true)

  useEffect(() => {
    // Fetch bookings only when dialog is open and user ID is available
    if (isOpen && user?.id) {
      fetchUserBookings()
    }
  }, [isOpen, user?.id])

  // Expand bookings by members
  function expandBookingsByMembers(bookings: UserBooking[]) {
    const expanded: UserBooking[] = [];
    for (const booking of bookings) {
      let members: any[] = [];
      try {
        if (typeof booking.booked_for_members === 'string') {
          members = JSON.parse(booking.booked_for_members);
        } else if (Array.isArray(booking.booked_for_members)) {
          members = booking.booked_for_members;
        }
      } catch {
        members = [];
      }
      if (members.length > 0) {
        for (const member of members) {
          expanded.push({ ...booking, member });
        }
      } else {
        expanded.push({ ...booking, member: null });
      }
    }
    return expanded;
  }

  const fetchUserBookings = async () => {
    setLoadingBookings(true)
    try {
      const { data: bookingsData, error } = await supabase
        .from('user_bookings')
        .select(`
          *,
          phlebo_detail (
            name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedBookings: UserBooking[] = (bookingsData || []).map(booking => ({
        id: booking.id,
        service_title: booking.service_title,
        original_price: booking.original_price,
        discounted_price: booking.discounted_price,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        status: booking.status,
        created_at: booking.created_at,
        address: booking.address,
        phlebo_uid: booking.phlebo_uid,
        phlebo_detail: booking.phlebo_detail,
        booked_for_members: booking.booked_for_members, // Ensure this is included
        member: booking.member // Ensure this is included
      }))
      setBookings(formattedBookings)
      setFilteredBookings(formattedBookings)
    } catch (error) {
      console.error('Error fetching user bookings:', error)
    } finally {
      setLoadingBookings(false)
    }
  }

  const handleDateFilterBookings = (filter: string) => {
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

  const handleSearchBookings = (search: string) => {
    if (!search.trim()) {
      setFilteredBookings(bookings)
    } else {
      const lowercasedSearch = search.toLowerCase();
      const filtered = bookings.filter(booking =>
        booking.service_title?.toLowerCase().includes(lowercasedSearch) ||
        booking.status?.toLowerCase().includes(lowercasedSearch) ||
        booking.phlebo_detail?.name?.toLowerCase().includes(lowercasedSearch) ||
        booking.member?.name?.toLowerCase().includes(lowercasedSearch) ||
        booking.member?.phone?.toLowerCase().includes(lowercasedSearch)
      )
      setFilteredBookings(filtered)
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

  // To prevent rendering the dialog content when it's not open, which can cause hydration issues
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Details for {user.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <h3 className="font-semibold text-lg mb-2">User Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
            <div className="space-y-2">
              <div className="flex items-center"><Mail className="h-4 w-4 mr-2" /> <span>{user.email}</span></div>
              <div className="flex items-center"><Phone className="h-4 w-4 mr-2" /> <span>{user.phone || 'N/A'}</span></div>
              <div className="flex items-center"><MapPin className="h-4 w-4 mr-2" /> <span>{user.address || 'N/A'}</span></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center"><FileText className="h-4 w-4 mr-2" /> <span>Age: {user.age || 'N/A'}</span></div>
              <div className="flex items-center"><FileText className="h-4 w-4 mr-2" /> <span>Gender: {user.gender || 'N/A'}</span></div>
              <div className="flex items-center"><Calendar className="h-4 w-4 mr-2" /> <span>Joined: {format(new Date(user.created_at), 'MMM dd, yyyy')}</span></div>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="font-semibold text-lg mb-4">User Bookings</h3>
            <FilterBar
              onDateFilter={handleDateFilterBookings}
              onSearch={handleSearchBookings}
              showStatus={true}
            />
            {loadingBookings ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredBookings.length === 0 ? (
              <p className="text-center text-gray-500 mt-4">No bookings found for this user within the selected filters.</p>
            ) : (
              <Card className="mt-4">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Phlebotomist</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Member Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expandBookingsByMembers(filteredBookings).map((booking, idx) => (
                        <TableRow key={booking.id + '-' + (booking.member?.id || idx)}>
                          <TableCell>
                            <div className="font-medium flex items-center">
                              <ShoppingBag className="h-4 w-4 mr-2 text-blue-500" />
                              {booking.service_title}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />{booking.address}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(booking.booking_date), 'MMM dd, yyyy')}
                            </div>
                            <div className="flex items-center text-sm">
                              <Clock className="h-3 w-3 mr-1" />
                              {booking.booking_time}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                              ₹{booking.discounted_price}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(booking.status)}>
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {booking.phlebo_detail?.name || 'Unassigned'}
                          </TableCell>
                          <TableCell>
                            {booking.member?.name || '-'}
                          </TableCell>
                          <TableCell>
                            {booking.member?.phone || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- Main UsersPage Component ---
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null) // State for selected user
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false) // State for dialog visibility

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('type', 'patient')
        .order('created_at', { ascending: false })

      if (error) throw error

      setUsers(data || [])
      setFilteredUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = (filter: string) => {
    const now = new Date()
    let filtered = users

    switch (filter) {
      case 'today':
        filtered = users.filter(user =>
          new Date(user.created_at).toDateString() === now.toDateString()
        )
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = users.filter(user => new Date(user.created_at) >= weekAgo)
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filtered = users.filter(user => new Date(user.created_at) >= monthAgo)
        break
      default:
        filtered = users
    }

    setFilteredUsers(filtered)
  }

  const handleSearch = (search: string) => {
    if (!search.trim()) {
      setFilteredUsers(users); // If search is empty, show all users
    } else {
      const filtered = users.filter(user =>
        user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase()) ||
        user.phone?.includes(search)
      )
      setFilteredUsers(filtered)
    }
  }

  // Function to open the user details dialog
  const handleViewDetails = (user: User) => {
    setSelectedUser(user)
    setIsDetailsDialogOpen(true)
  }

  // Function to close the user details dialog
  const handleCloseDetailsDialog = () => {
    setIsDetailsDialogOpen(false)
    setSelectedUser(null) // Clear the selected user when dialog closes
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
          <h1 className="text-3xl font-bold text-gray-900">Users Management</h1>
          <Badge variant="outline" className="text-lg px-4 py-2">
            Total: {filteredUsers.length}
          </Badge>
        </div>

        <FilterBar onDateFilter={handleDateFilter} onSearch={handleSearch} />

        <Card>
          <CardHeader>
            <CardTitle>User List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {user.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.full_name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Phone className="h-3 w-3 mr-1" />
                          {user.phone || 'N/A'}
                        </div>
                        <div className="flex items-center text-sm">
                          <Mail className="h-3 w-3 mr-1" />
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          Age: {user.age || 'N/A'} | Gender: {user.gender || 'N/A'}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="h-3 w-3 mr-1" />
                          {user.address || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(user.created_at), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Active</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(user)}>
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

        {/* User Details Dialog (conditionally rendered) */}
        {selectedUser && (
          <UserDetailsDialog
            user={selectedUser}
            isOpen={isDetailsDialogOpen}
            onClose={handleCloseDetailsDialog}
          />
        )}
      </div>
    </DashboardLayout>
  )
}