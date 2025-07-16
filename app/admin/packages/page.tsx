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
import { Plus, Edit, Trash2, Package, DollarSign, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

interface PackageDetail {
  id: string
  title: string
  original_price: number
  discounted_price: number
  details: string[]
  image_path: string
  reports_time: string
  number_of_tests: string
  categories: string[]
  updated_at: string
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<PackageDetail[]>([])
  const [filteredPackages, setFilteredPackages] = useState<PackageDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<PackageDetail | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    original_price: '',
    discounted_price: '',
    details: '',
    image_path: '',
    reports_time: '',
    number_of_tests: '',
    categories: ''
  })

  useEffect(() => {
    fetchPackages()
  }, [])

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('package_details')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      
      setPackages(data || [])
      setFilteredPackages(data || [])
    } catch (error) {
      console.error('Error fetching packages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = (filter: string) => {
    const now = new Date()
    let filtered = packages

    switch (filter) {
      case 'today':
        filtered = packages.filter(pkg => 
          new Date(pkg.updated_at).toDateString() === now.toDateString()
        )
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = packages.filter(pkg => new Date(pkg.updated_at) >= weekAgo)
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filtered = packages.filter(pkg => new Date(pkg.updated_at) >= monthAgo)
        break
      default:
        filtered = packages
    }

    setFilteredPackages(filtered)
  }

  const handleSearch = (search: string) => {
    const filtered = packages.filter(pkg =>
      pkg.title.toLowerCase().includes(search.toLowerCase()) ||
      pkg.categories.some(cat => cat.toLowerCase().includes(search.toLowerCase()))
    )
    setFilteredPackages(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const packageData = {
      title: formData.title,
      original_price: parseFloat(formData.original_price),
      discounted_price: parseFloat(formData.discounted_price),
      details: formData.details.split('\n').filter(detail => detail.trim()),
      image_path: formData.image_path,
      reports_time: formData.reports_time,
      number_of_tests: formData.number_of_tests,
      categories: formData.categories.split(',').map(cat => cat.trim())
    }

    try {
      if (editingPackage) {
        const { error } = await supabase
          .from('package_details')
          .update(packageData)
          .eq('id', editingPackage.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('package_details')
          .insert([packageData])
        
        if (error) throw error
      }

      setIsDialogOpen(false)
      setEditingPackage(null)
      setFormData({
        title: '',
        original_price: '',
        discounted_price: '',
        details: '',
        image_path: '',
        reports_time: '',
        number_of_tests: '',
        categories: ''
      })
      fetchPackages()
    } catch (error) {
      console.error('Error saving package:', error)
    }
  }

  const handleEdit = (pkg: PackageDetail) => {
    setEditingPackage(pkg)
    setFormData({
      title: pkg.title,
      original_price: pkg.original_price.toString(),
      discounted_price: pkg.discounted_price.toString(),
      details: pkg.details.join('\n'),
      image_path: pkg.image_path,
      reports_time: pkg.reports_time,
      number_of_tests: pkg.number_of_tests,
      categories: pkg.categories.join(', ')
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this package?')) {
      try {
        const { error } = await supabase
          .from('package_details')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        fetchPackages()
      } catch (error) {
        console.error('Error deleting package:', error)
      }
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
          <h1 className="text-3xl font-bold text-gray-900">Packages Management</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Package
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingPackage ? 'Edit Package' : 'Add New Package'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="number_of_tests">Number of Tests</Label>
                    <Input
                      id="number_of_tests"
                      value={formData.number_of_tests}
                      onChange={(e) => setFormData({...formData, number_of_tests: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="original_price">Original Price</Label>
                    <Input
                      id="original_price"
                      type="number"
                      value={formData.original_price}
                      onChange={(e) => setFormData({...formData, original_price: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="discounted_price">Discounted Price</Label>
                    <Input
                      id="discounted_price"
                      type="number"
                      value={formData.discounted_price}
                      onChange={(e) => setFormData({...formData, discounted_price: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reports_time">Reports Time</Label>
                    <Input
                      id="reports_time"
                      value={formData.reports_time}
                      onChange={(e) => setFormData({...formData, reports_time: e.target.value})}
                      placeholder="e.g., 24 hours"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="image_path">Image Path</Label>
                    <Input
                      id="image_path"
                      value={formData.image_path}
                      onChange={(e) => setFormData({...formData, image_path: e.target.value})}
                      placeholder="Image URL"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="categories">Categories (comma-separated)</Label>
                  <Input
                    id="categories"
                    value={formData.categories}
                    onChange={(e) => setFormData({...formData, categories: e.target.value})}
                    placeholder="e.g., Blood Test, Health Checkup"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="details">Details (one per line)</Label>
                  <Textarea
                    id="details"
                    value={formData.details}
                    onChange={(e) => setFormData({...formData, details: e.target.value})}
                    placeholder="Enter package details, one per line"
                    rows={4}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">
                    {editingPackage ? 'Update Package' : 'Create Package'}
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
            <CardTitle>Package List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead>Reports Time</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPackages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Package className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{pkg.title}</div>
                          <div className="text-sm text-gray-500">{pkg.details.length} details</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="text-lg font-semibold">{pkg.number_of_tests}</div>
                        <div className="text-sm text-gray-500">tests</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                          <span className="font-semibold">₹{pkg.discounted_price}</span>
                        </div>
                        <div className="text-sm text-gray-500 line-through">₹{pkg.original_price}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-blue-600 mr-1" />
                        <span className="text-sm">{pkg.reports_time}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {pkg.categories.map((category, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(pkg.updated_at), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(pkg)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(pkg.id)}>
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