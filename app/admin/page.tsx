'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import StatsCard from '@/components/StatsCard'
import FilterBar from '@/components/FilterBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, Calendar, DollarSign, TrendingUp, Package, TestTube, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import { Dialog, DialogContent } from '@/components/ui/dialog'

// Define a type for your booking objects for better type safety
interface Booking {
  id: string;
  created_at: string;
  discounted_price: number;
  status: string;
  service_title?: string;
  user_id?: string;
  booking_type?: string;
  patient_details?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  profiles?: {
    full_name?: string;
    phone?: string;
    email?: string;
  };
  booked_for_members?: string | any[];
  member?: {
    id?: string;
    name?: string;
    phone?: string;
    age?: number;
    gender?: string;
  } | null;
}

interface UserProfileSuggestion {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string;
}

// Add a type for full user details
interface UserDetail extends UserProfileSuggestion {
  gender?: string;
  age?: number;
  address?: string;
}

export default function AdminDashboard() {
  // --- Date comparison helpers ---
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
  const isSameMonth = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth();
  const isSameWeek = (d1: Date, d2: Date) => {
    // Week starts on Monday
    const dayOfWeek = d2.getDay() === 0 ? 6 : d2.getDay() - 1;
    const weekStart = new Date(d2);
    weekStart.setDate(d2.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return d1 >= weekStart && d1 < weekEnd;
  };

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPhlebotomists: 0,
    totalBookings: 0,
    totalRevenue: 0,
    todayBookings: 0,
    completedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    collectedBookings: 0,
  })
  // Added state for filters
  const [dateFilter, setDateFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProfile, setSelectedProfile] = useState<UserProfileSuggestion | null>(null)
  const [profileSuggestions, setProfileSuggestions] = useState<UserProfileSuggestion[]>([])

  const [bookingData, setBookingData] = useState<any[]>([])
  const [serviceData, setServiceData] = useState<any[]>([])
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [bookingDataRaw, setBookingDataRaw] = useState<Booking[]>([])
  const router = useRouter()

  // Remove userList and user modal state

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }
      await fetchDashboardData()
    }
    checkAuthAndFetch()
  }, [router, dateFilter, searchQuery, selectedProfile])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch user count
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'patient')

      // Fetch phlebotomist count
      const { count: phleboCount } = await supabase
        .from('phlebo_detail')
        .select('*', { count: 'exact', head: true })

      // Fetch all bookings with joined profiles
      const { data: bookings } = await supabase.from('user_bookings').select('*, profiles(full_name, phone, email)')
      const allBookings: Booking[] = (bookings || []).map(b => ({ ...b, booking_type: 'test' }));
      setBookingDataRaw(allBookings)

      // Apply search filter first
      let searchedBookings = allBookings
      if (selectedProfile) {
        searchedBookings = allBookings.filter((booking: Booking) => booking.user_id === selectedProfile.id)
      } else if (searchQuery) {
        searchedBookings = allBookings.filter((booking: Booking) => {
          const searchLower = searchQuery.toLowerCase();
          const serviceTitle = booking.service_title?.toLowerCase() || '';
          const userName = booking.profiles?.full_name?.toLowerCase() || '';
          const userEmail = booking.profiles?.email?.toLowerCase() || '';
          const userPhone = booking.profiles?.phone?.toLowerCase() || '';
          const bookingId = booking.id?.toLowerCase() || '';
          const patientName = booking.patient_details?.name?.toLowerCase() || '';
          const patientPhone = booking.patient_details?.phone?.toLowerCase() || '';
          return (
            serviceTitle.includes(searchLower) ||
            userName.includes(searchLower) ||
            userEmail.includes(searchLower) ||
            userPhone.includes(searchLower) ||
            bookingId.includes(searchLower) ||
            patientName.includes(searchLower) ||
            patientPhone.includes(searchLower)
          );
        })
      }

      // Now apply date filter on the searched results
      const now = new Date()
      const filteredAndDatedBookings = searchedBookings.filter((booking: Booking) => {
        const bookingDate = new Date(booking.created_at)
        switch (dateFilter) {
          case 'today':
            return isSameDay(bookingDate, now);
          case 'thisWeek':
            return isSameWeek(bookingDate, now);
          case 'thisMonth':
            return isSameMonth(bookingDate, now);
          case 'all':
          default:
            return true;
        }
      });

      // Calculate statistics from the final filtered data
      const totalBookings = filteredAndDatedBookings.length

      const totalRevenue = filteredAndDatedBookings
        .filter((booking: Booking) =>
          ['collected', 'reported', 'completed'].includes(booking.status?.toLowerCase())
        )
        .reduce((sum, booking: Booking) => sum + (booking.discounted_price || 0), 0)

      const todayBookings = filteredAndDatedBookings.filter((booking: Booking) =>
        isSameDay(new Date(booking.created_at), new Date())
      ).length

      const completedBookings = filteredAndDatedBookings.filter((booking: Booking) =>
        ['completed', 'reported'].includes(booking.status?.toLowerCase())
      ).length

      const collectedBookings = filteredAndDatedBookings.filter((booking: Booking) => booking.status?.toLowerCase() === 'collected').length
      const pendingBookings = filteredAndDatedBookings.filter((booking: Booking) => booking.status?.toLowerCase() === 'pending').length
      const cancelledBookings = filteredAndDatedBookings.filter((booking: Booking) => booking.status?.toLowerCase() === 'cancelled').length

      setStats({
        totalUsers: userCount || 0,
        totalPhlebotomists: phleboCount || 0,
        totalBookings,
        totalRevenue,
        todayBookings,
        completedBookings,
        pendingBookings,
        cancelledBookings,
        collectedBookings,
      })

      // Prepare chart data based on filtered data
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        return date.toISOString().split('T')[0]
      }).reverse()

      const chartData = last7Days.map(date => ({
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        bookings: filteredAndDatedBookings.filter((booking: Booking) =>
          booking.created_at.split('T')[0] === date
        ).length,
        revenue: filteredAndDatedBookings.filter((booking: Booking) =>
          booking.created_at.split('T')[0] === date && ['collected', 'reported', 'completed'].includes(booking.status?.toLowerCase())
        ).reduce((sum, booking: Booking) => sum + (booking.discounted_price || 0), 0)
      }))

      setBookingData(chartData)
      setRevenueData(chartData)

      // Service distribution from filtered data
      const serviceDistribution = [
        { name: 'Lab Tests', value: filteredAndDatedBookings.length }
      ];
      setServiceData(serviceDistribution)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = (filter: string) => {
    setDateFilter(filter)
  }

  const handleSearch = (search: string) => {
    setSearchQuery(search)
    setSelectedProfile(null)
  }

  const handleSuggestionSelect = (profile: UserProfileSuggestion) => {
    setSelectedProfile(profile)
    setSearchQuery(profile.full_name || profile.email || profile.phone || '')
  }

  // Helper to expand bookings by members
  function expandBookingsByMembers(bookings: Booking[]) {
    const expanded: Booking[] = [];
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

  // Memoize filtered bookings for use in table and stats
  const filteredAndDatedBookings = useMemo(() => {
    // This logic matches fetchDashboardData's filtering
    let searchedBookings = bookingDataRaw // bookingDataRaw will be the unfiltered allBookings
    if (selectedProfile) {
      searchedBookings = bookingDataRaw.filter((booking: Booking) => booking.user_id === selectedProfile.id)
    } else if (searchQuery) {
      searchedBookings = bookingDataRaw.filter((booking: Booking) => {
        const searchLower = searchQuery.toLowerCase();
        const serviceTitle = booking.service_title?.toLowerCase() || '';
        const userName = booking.profiles?.full_name?.toLowerCase() || '';
        const userEmail = booking.profiles?.email?.toLowerCase() || '';
        const userPhone = booking.profiles?.phone?.toLowerCase() || '';
        const bookingId = booking.id?.toLowerCase() || '';
        const patientName = booking.patient_details?.name?.toLowerCase() || '';
        const patientPhone = booking.patient_details?.phone?.toLowerCase() || '';
        return (
          serviceTitle.includes(searchLower) ||
          userName.includes(searchLower) ||
          userEmail.includes(searchLower) ||
          userPhone.includes(searchLower) ||
          bookingId.includes(searchLower) ||
          patientName.includes(searchLower) ||
          patientPhone.includes(searchLower)
        );
      })
    }
    const now = new Date()
    const dated = searchedBookings.filter((booking: Booking) => {
      const bookingDate = new Date(booking.created_at)
      switch (dateFilter) {
        case 'today':
          return isSameDay(bookingDate, now);
        case 'thisWeek':
          return isSameWeek(bookingDate, now);
        case 'thisMonth':
          return isSameMonth(bookingDate, now);
        case 'all':
        default:
          return true;
      }
    })
    // Expand by members
    return expandBookingsByMembers(dated)
  }, [bookingDataRaw, selectedProfile, searchQuery, dateFilter])

  // --- Stats based on expanded bookings ---
  const totalBookings = filteredAndDatedBookings.length;
  const totalRevenue = filteredAndDatedBookings
    .filter((booking: Booking) =>
      ['collected', 'reported', 'completed'].includes(booking.status?.toLowerCase())
    )
    .reduce((sum, booking: Booking) => sum + (booking.discounted_price || 0), 0);
  const todayBookings = filteredAndDatedBookings.filter((booking: Booking) =>
    isSameDay(new Date(booking.created_at), new Date())
  ).length;
  const completedBookings = filteredAndDatedBookings.filter((booking: Booking) =>
    ['completed', 'reported'].includes(booking.status?.toLowerCase())
  ).length;
  const collectedBookings = filteredAndDatedBookings.filter((booking: Booking) => booking.status?.toLowerCase() === 'collected').length;
  const pendingBookings = filteredAndDatedBookings.filter((booking: Booking) => booking.status?.toLowerCase() === 'pending').length;
  const cancelledBookings = filteredAndDatedBookings.filter((booking: Booking) => booking.status?.toLowerCase() === 'cancelled').length;

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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>

        <FilterBar
          onDateFilter={handleDateFilter}
          onSearch={handleSearch}
          suggestions={profileSuggestions}
          onSuggestionSelect={handleSuggestionSelect}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Users"
            value={stats.totalUsers}
            change=""
            icon={<Users className="h-6 w-6" />}
            color="blue"
          />
          <StatsCard
            title="Phlebotomists"
            value={stats.totalPhlebotomists}
            change=""
            icon={<UserCheck className="h-6 w-6" />}
            color="green"
          />
          <StatsCard
            title="Total Bookings"
            value={totalBookings}
            change=""
            icon={<Calendar className="h-6 w-6" />}
            color="yellow"
          />
          <StatsCard
            title="Total Revenue"
            value={`₹${totalRevenue.toLocaleString()}`}
            change=""
            icon={<DollarSign className="h-6 w-6" />}
            color="green"
          />
        </div>

        {/* Booking Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Today's Bookings"
            value={todayBookings}
            icon={<Calendar className="h-6 w-6" />}
            color="blue"
          />
          <StatsCard
            title="Completed"
            value={completedBookings}
            icon={<TrendingUp className="h-6 w-6" />}
            color="green"
          />
          <StatsCard
            title="Collected"
            value={collectedBookings}
            icon={<TestTube className="h-6 w-6" />}
            color="blue"
          />
          <StatsCard
            title="Pending"
            value={pendingBookings}
            icon={<Package className="h-6 w-6" />}
            color="yellow"
          />
        </div>

        {/* Booking List Table */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Booking List</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 border-b text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User Name</th>
                  <th className="px-6 py-3 border-b text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 border-b text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 border-b text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 border-b text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 border-b text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 border-b text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAndDatedBookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-6 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <Camera className="h-12 w-12 text-gray-400 mb-3" />
                        <p className="text-lg font-medium text-gray-900">No bookings found.</p>
                        <p className="text-sm text-gray-500">Try adjusting your filters or check back later.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAndDatedBookings.map((booking, idx) => (
                    <tr key={booking.id + '-' + (booking.member?.id || idx)} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-3 border-b text-sm">{booking.member?.name || booking.profiles?.full_name || booking.patient_details?.name || '-'}</td>
                      <td className="px-6 py-3 border-b text-sm">{booking.profiles?.email || booking.patient_details?.email || '-'}</td>
                      <td className="px-6 py-3 border-b text-sm">{booking.member?.phone || booking.profiles?.phone || booking.patient_details?.phone || '-'}</td>
                      <td className="px-6 py-3 border-b text-sm">{booking.service_title || '-'}</td>
                      <td className="px-6 py-3 border-b text-sm capitalize">{booking.status || '-'}</td>
                      <td className="px-6 py-3 border-b text-sm">{new Date(booking.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-3 border-b text-sm">₹{booking.discounted_price || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}