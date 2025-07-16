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
import { Switch } from '@/components/ui/switch'
import { Plus, Edit, Trash2, Stethoscope, Clock, DollarSign } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

interface XRayService {
  id: string
  service_name: string
  description: string
  base_price: number
  estimated_duration_minutes: number
  preparation_instructions: string
  is_active: boolean
  created_at: string
}

export default function XRayPage() {
  const [services, setServices] = useState<XRayService[]>([])
  const [filteredServices, setFilteredServices] = useState<XRayService[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<XRayService | null>(null)
  const [formData, setFormData] = useState({
    service_name: '',
    description: '',
    base_price: '',
    estimated_duration_minutes: '',
    preparation_instructions: '',
    is_active: true
  })

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('xray_services')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setServices(data || [])
      setFilteredServices(data || [])
    } catch (error) {
      console.error('Error fetching X-ray services:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = (filter: string) => {
    const now = new Date()
    let filtered = services

    switch (filter) {
      case 'today':
        filtered = services.filter(service => 
          new Date(service.created_at).toDateString() === now.toDateString()
        )
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = services.filter(service => new Date(service.created_at) >= weekAgo)
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filtered = services.filter(service => new Date(service.created_at) >= monthAgo)
        break
      default:
        filtered = services
    }

    setFilteredServices(filtered)
  }

  const handleSearch = (search: string) => {
    const filtered = services.filter(service =>
      service.service_name.toLowerCase().includes(search.toLowerCase()) ||
      service.description?.toLowerCase().includes(search.toLowerCase())
    )
    setFilteredServices(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const serviceData = {
      service_name: formData.service_name,
      description: formData.description,
      base_price: parseFloat(formData.base_price),
      estimated_duration_minutes: parseInt(formData.estimated_duration_minutes),
      preparation_instructions: formData.preparation_instructions,
      is_active: formData.is_active
    }

    try {
      if (editingService) {
        const { error } = await supabase
          .from('xray_services')
          .update(serviceData)
          .eq('id', editingService.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('xray_services')
          .insert([serviceData])
        
        if (error) throw error
      }

      setIsDialogOpen(false)
      setEditingService(null)
      setFormData({
        service_name: '',
        description: '',
        base_price: '',
        estimated_duration_minutes: '',
        preparation_instructions: '',
        is_active: true
      })
      fetchServices()
    } catch (error) {
      console.error('Error saving X-ray service:', error)
    }
  }

  const handleEdit = (service: XRayService) => {
    setEditingService(service)
    setFormData({
      service_name: service.service_name,
      description: service.description || '',
      base_price: service.base_price.toString(),
      estimated_duration_minutes: service.estimated_duration_minutes?.toString() || '',
      preparation_instructions: service.preparation_instructions || '',
      is_active: service.is_active
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this X-ray service?')) {
      try {
        const { error } = await supabase
          .from('xray_services')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        fetchServices()
      } catch (error) {
        console.error('Error deleting X-ray service:', error)
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
          <h1 className="text-3xl font-bold text-gray-900">X-Ray Services</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add X-Ray Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingService ? 'Edit X-Ray Service' : 'Add New X-Ray Service'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="service_name">Service Name</Label>
                  <Input
                    id="service_name"
                    value={formData.service_name}
                    onChange={(e) => setFormData({...formData, service_name: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="base_price">Base Price</Label>
                    <Input
                      id="base_price"
                      type="number"
                      value={formData.base_price}
                      onChange={(e) => setFormData({...formData, base_price: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="estimated_duration_minutes">Duration (minutes)</Label>
                    <Input
                      id="estimated_duration_minutes"
                      type="number"
                      value={formData.estimated_duration_minutes}
                      onChange={(e) => setFormData({...formData, estimated_duration_minutes: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="preparation_instructions">Preparation Instructions</Label>
                  <Textarea
                    id="preparation_instructions"
                    value={formData.preparation_instructions}
                    onChange={(e) => setFormData({...formData, preparation_instructions: e.target.value})}
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">
                    {editingService ? 'Update Service' : 'Create Service'}
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
            <CardTitle>X-Ray Services ({filteredServices.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                          <Stethoscope className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <div className="font-medium">{service.service_name}</div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {service.description}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                        <span className="font-semibold">₹{service.base_price}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-blue-600 mr-1" />
                        <span className="text-sm">{service.estimated_duration_minutes || 'N/A'} min</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={service.is_active ? 'default' : 'secondary'}>
                        {service.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(service.created_at), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(service)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(service.id)}>
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