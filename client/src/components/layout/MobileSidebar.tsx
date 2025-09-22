import React from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

interface MobileSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({ activeSection, onSectionChange }) => {
  const [open, setOpen] = React.useState(false);

  const handleSectionChange = (section: string) => {
    onSectionChange(section);
    setOpen(false); // Close sidebar when item is selected
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <Sidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
      </SheetContent>
    </Sheet>
  );
};

export default MobileSidebar;