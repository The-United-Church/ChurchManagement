import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import MemberSidebar from './MemberSidebar';

const MobileMemberSidebar: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const { pathname } = useLocation();

  // Close the sheet whenever the route changes (navigation occurred)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <MemberSidebar />
      </SheetContent>
    </Sheet>
  );
};

export default MobileMemberSidebar;
