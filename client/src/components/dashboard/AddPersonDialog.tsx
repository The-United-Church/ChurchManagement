import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import { User, Pencil, Calendar as CalendarIcon } from 'lucide-react';
import type { Person } from '@/types/person';

interface AddPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPerson: (newPerson: Omit<Person, 'id' | 'name'>) => void;
}

const AddPersonDialog: React.FC<AddPersonDialogProps> = ({ open, onOpenChange, onAddPerson }) => {
  const [birthdateDate, setBirthdateDate] = useState<Date>();
  const [newPerson, setNewPerson] = useState<Omit<Person, 'id' | 'name'>>({
    firstName: '',
    lastName: '',
    middleName: '',
    nickname: '',
    birthdate: '',
    gender: 'male',
    addressLine: '',
    state: '',
    city: '',
    postalCode: '',
    envelopeNumber: '',
    email: '',
    mobile: '',
    homePhone: ''
  });

  const handleSave = () => {
    onAddPerson(newPerson);
    setNewPerson({
      firstName: '',
      lastName: '',
      middleName: '',
      nickname: '',
      birthdate: '',
      gender: 'male',
      addressLine: '',
      state: '',
      city: '',
      postalCode: '',
      envelopeNumber: '',
      email: '',
      mobile: '',
      homePhone: ''
    });
    setBirthdateDate(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add Person</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-4">
          {/* Left Column - Personal Info */}
          <div className="md:col-span-7 space-y-6">
            {/* Avatar */}
            <div className="flex justify-center">
              <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-white shadow-sm">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gray-200 text-gray-400">
                    <User className="h-16 w-16" />
                  </AvatarFallback>
                </Avatar>
                <Button size="icon" className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-teal-600 hover:bg-teal-700 text-white border-2 border-white">
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Name Fields */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-xs font-bold text-gray-700">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      id="firstName"
                      value={newPerson.firstName}
                      onChange={(e) => setNewPerson({ ...newPerson, firstName: e.target.value })}
                      className="border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-teal-600 bg-transparent" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-xs font-bold text-gray-700">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      id="lastName"
                      value={newPerson.lastName}
                      onChange={(e) => setNewPerson({ ...newPerson, lastName: e.target.value })}
                      className="border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-teal-600 bg-transparent" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="middleName" className="text-xs font-bold text-gray-700">Middle Name</Label>
                    <Input 
                      id="middleName"
                      value={newPerson.middleName}
                      onChange={(e) => setNewPerson({ ...newPerson, middleName: e.target.value })}
                      className="border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-teal-600 bg-transparent" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nickname" className="text-xs font-bold text-gray-700">Nickname</Label>
                    <Input 
                      id="nickname"
                      value={newPerson.nickname}
                      onChange={(e) => setNewPerson({ ...newPerson, nickname: e.target.value })}
                      className="border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-teal-600 bg-transparent" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Birthdate & Gender */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="birthdate" className="text-xs font-bold text-gray-700">Birthdate</Label>
                    <div className="relative">
                      <DatePicker
                        selected={birthdateDate}
                        onChange={(date: Date) => {
                          setBirthdateDate(date);
                          setNewPerson({ ...newPerson, birthdate: date ? format(date, "dd/MM/yyyy") : '' });
                        }}
                        showYearDropdown
                        showMonthDropdown
                        dropdownMode="select"
                        customInput={
                          <div className="relative">
                            <Input
                              value={birthdateDate ? format(birthdateDate, "dd/MM/yyyy") : ""}
                              readOnly
                              placeholder="DD/MM/YYYY"
                              className="border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-teal-600 bg-transparent pr-8"
                            />
                            <CalendarIcon className="absolute right-0 top-2 h-4 w-4 text-gray-400" />
                          </div>
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-700">Gender</Label>
                    <div className="flex gap-6 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div className={`w-5 h-5 rounded-full border ${newPerson.gender === 'male' ? 'border-teal-600' : 'border-gray-300'} flex items-center justify-center bg-white`}>
                          {newPerson.gender === 'male' && <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />}
                        </div>
                        <input 
                          type="radio" 
                          name="gender" 
                          className="hidden" 
                          checked={newPerson.gender === 'male'} 
                          onChange={() => setNewPerson({ ...newPerson, gender: 'male' })}
                        />
                        <span className="text-sm text-teal-900">Male</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div className={`w-5 h-5 rounded-full border ${newPerson.gender === 'female' ? 'border-teal-600' : 'border-gray-300'} flex items-center justify-center bg-white`}>
                          {newPerson.gender === 'female' && <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />}
                        </div>
                        <input 
                          type="radio" 
                          name="gender" 
                          className="hidden" 
                          checked={newPerson.gender === 'female'} 
                          onChange={() => setNewPerson({ ...newPerson, gender: 'female' })}
                        />
                        <span className="text-sm text-teal-900">Female</span>
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Address & Other */}
          <div className="md:col-span-5 space-y-6">
            <Card className="border-none shadow-sm h-fit bg-white overflow-hidden">
              <Tabs defaultValue="address" className="w-full">
                <TabsList className="w-full justify-start bg-transparent border-b border-gray-100 rounded-none h-auto p-0">
                  <TabsTrigger 
                    value="address" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:text-teal-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 font-semibold text-gray-500"
                  >
                    Address
                  </TabsTrigger>
                  <TabsTrigger 
                    value="map" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:text-teal-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 font-semibold text-gray-500"
                  >
                    Map
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="address" className="p-6 space-y-6 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="addressLine" className="text-xs font-bold text-gray-700">Address Line</Label>
                    <Input 
                      id="addressLine"
                      value={newPerson.addressLine}
                      onChange={(e) => setNewPerson({ ...newPerson, addressLine: e.target.value })}
                      className="border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-teal-600 bg-transparent" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-700">State</Label>
                      <Select 
                        value={newPerson.state} 
                        onValueChange={(value) => setNewPerson({ ...newPerson, state: value })}
                      >
                        <SelectTrigger className="border-0 border-b border-gray-300 rounded-none px-0 focus:ring-0 shadow-none bg-transparent">
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="rivers">Rivers State</SelectItem>
                          <SelectItem value="lagos">Lagos State</SelectItem>
                          <SelectItem value="abuja">Abuja FCT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-xs font-bold text-gray-700">City</Label>
                      <Input 
                        id="city"
                        value={newPerson.city}
                        onChange={(e) => setNewPerson({ ...newPerson, city: e.target.value })}
                        className="border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-teal-600 bg-transparent" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode" className="text-xs font-bold text-gray-700">Postal Code</Label>
                    <Input 
                      id="postalCode"
                      value={newPerson.postalCode}
                      onChange={(e) => setNewPerson({ ...newPerson, postalCode: e.target.value })}
                      className="border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-teal-600 bg-transparent w-1/2" 
                    />
                  </div>

                  {/* Added Contact Info here since it's related to address/location */}
                  <div className="pt-4 border-t border-gray-100 mt-4">
                    <h4 className="text-sm font-semibold mb-4 text-gray-900">Contact Information</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs font-bold text-gray-700">Email</Label>
                        <Input 
                          id="email"
                          value={newPerson.email}
                          onChange={(e) => setNewPerson({ ...newPerson, email: e.target.value })}
                          className="border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-teal-600 bg-transparent" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mobile" className="text-xs font-bold text-gray-700">Mobile</Label>
                        <Input 
                          id="mobile"
                          value={newPerson.mobile}
                          onChange={(e) => setNewPerson({ ...newPerson, mobile: e.target.value })}
                          className="border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-teal-600 bg-transparent" 
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="map" className="p-6 mt-0 h-64 flex items-center justify-center bg-gray-50">
                  <p className="text-gray-500">Map view will be available here</p>
                </TabsContent>
              </Tabs>
            </Card>

            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <div className="space-y-2">
                  <Label htmlFor="envelopeNumber" className="text-xs font-bold text-gray-700">Envelope Number</Label>
                  <Input 
                    id="envelopeNumber"
                    value={newPerson.envelopeNumber}
                    onChange={(e) => setNewPerson({ ...newPerson, envelopeNumber: e.target.value })}
                    className="border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0 focus-visible:border-teal-600 bg-transparent" 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="bg-white p-4 -mx-6 -mb-6 border-t border-gray-100 mt-6">
          <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-white px-8">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPersonDialog;
