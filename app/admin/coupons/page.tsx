'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import FilterBar from '@/components/FilterBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, Ticket, Calendar, Image } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

interface Coupon {
  id: number
  created_at: string
  coupen_img: string
  coupen_heading: string
  coupen_data: string
  coupen_term: string
  valid_day: string
  coupen_code: string
  type: string
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [formData, setFormData] = useState({
    coupen_img: '',
    coupen_heading: '',
    coupen_data: '',
    coupen_term: '',
    valid_day: '',
    coupen_code: '',
    type: ''
  })

  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupen')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setCoupons(data || [])
      setFilteredCoupons(data || [])
    } catch (error) {
      console.error('Error fetching coupons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = (filter: string) => {
    const now = new Date()
    let filtered = coupons

    switch (filter) {
      case 'today':
        filtered = coupons.filter(coupon => 
          new Date(coupon.created_at).toDateString() === now.toDateString()
        )
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = coupons.filter(coupon => new Date(coupon.created_at) >= weekAgo)
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filtered = coupons.filter(coupon => new Date(coupon.created_at) >= monthAgo)
        break
      default:
        filtered = coupons
    }

    setFilteredCoupons(filtered)
  }

  const handleSearch = (search: string) => {
    const filtered = coupons.filter(coupon =>
      coupon.coupen_heading?.toLowerCase().includes(search.toLowerCase()) ||
      coupon.coupen_code?.toLowerCase().includes(search.toLowerCase()) ||
      coupon.type?.toLowerCase().includes(search.toLowerCase())
    )
    setFilteredCoupons(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingCoupon) {
        const { error } = await supabase
          .from('coupen')
          .update(formData)
          .eq('id', editingCoupon.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('coupen')
          .insert([formData])
        
        if (error) throw error
      }

      setIsDialogOpen(false)
      setEditingCoupon(null)
      setFormData({
        coupen_img: '',
        coupen_heading: '',
        coupen_data: '',
        coupen_term: '',
        valid_day: '',
        coupen_code: '',
        type: ''
      })
      fetchCoupons()
    } catch (error) {
      console.error('Error saving coupon:', error)
    }
  }

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      coupen_img: coupon.coupen_img || '',
      coupen_heading: coupon.coupen_heading || '',
      coupen_data: coupon.coupen_data || '',
      coupen_term: coupon.coupen_term || '',
      valid_day: coupon.valid_day || '',
      coupen_code: coupon.coupen_code || '',
      type: coupon.type || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this coupon?')) {
      try {
        const { error } = await supabase
          .from('coupen')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        fetchCoupons()
      } catch (error) {
        console.error('Error deleting coupon:', error)
      }
    }
  }

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'percentage':
        return 'bg-green-100 text-green-800'
      case 'fixed':
        return 'bg-blue-100 text-blue-800'
      case 'free_shipping':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Coupon Management</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingCoupon ? 'Edit Coupon' : 'Add New Coupon'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="coupen_heading">Coupon Heading</Label>
                    <Input
                      id="coupen_heading"
                      value={formData.coupen_heading}
                      onChange={(e) => setFormData({...formData, coupen_heading: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="coupen_code">Coupon Code</Label>
                    <Input
                      id="coupen_code"
                      value={formData.coupen_code}
                      onChange={(e) => setFormData({...formData, coupen_code: e.target.value})}
                      placeholder="e.g., SAVE20"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                        <SelectItem value="free_shipping">Free Shipping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="valid_day">Valid Days</Label>
                    <Input
                      id="valid_day"
                      value={formData.valid_day}
                      onChange={(e) => setFormData({...formData, valid_day: e.target.value})}
                      placeholder="e.g., 30 days"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="coupen_img">Coupon Image URL</Label>
                  <Input
                    id="coupen_img"
                    value={formData.coupen_img}
                    onChange={(e) => setFormData({...formData, coupen_img: e.target.value})}
                    placeholder="Image URL"
                  />
                </div>
                <div>
                  <Label htmlFor="coupen_data">Coupon Description</Label>
                  <Textarea
                    id="coupen_data"
                    value={formData.coupen_data}
                    onChange={(e) => setFormData({...formData, coupen_data: e.target.value})}
                    placeholder="Coupon description"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="coupen_term">Terms & Conditions</Label>
                  <Textarea
                    id="coupen_term"
                    value={formData.coupen_term}
                    onChange={(e) => setFormData({...formData, coupen_term: e.target.value})}
                    placeholder="Terms and conditions"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">
                    {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <FilterBar onDateFilter={handleDateFilter} onSearch={handleSearch} />

        <Card>
          <CardHeader>
            <CardTitle>Coupon List ({filteredCoupons.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coupon</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Valid Days</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCoupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {coupon.coupen_img ? (
                            <img 
                              src={coupon.coupen_img} 
                              alt="Coupon" 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <Ticket className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                          <div className="font-medium">{coupon.coupen_heading}</div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {coupon.coupen_data}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
                        {coupon.coupen_code}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(coupon.type)}>
                        {coupon.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-blue-600 mr-1" />
                        <span className="text-sm">{coupon.valid_day}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(coupon.created_at), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(coupon)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(coupon.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}