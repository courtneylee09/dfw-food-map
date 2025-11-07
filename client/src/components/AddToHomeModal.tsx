import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Smartphone } from 'lucide-react';

interface AddToHomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddToHomeModal({ isOpen, onClose }: AddToHomeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] max-h-[80vh] flex flex-col" data-testid="modal-add-to-home">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Quick Access Tip
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            Add this app to your home screen for faster access to food resources.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          <div className="flex justify-center py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-primary" />
            </div>
          </div>

          <div className="space-y-4 text-base pb-4">
            <div>
              <p className="font-semibold mb-2">On iPhone (Safari):</p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Tap the Share button at the bottom of the screen</li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Tap "Add" in the top right corner</li>
              </ol>
            </div>

            <div>
              <p className="font-semibold mb-2">On Android (Chrome):</p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Tap the menu button (three dots) in the top right</li>
                <li>Tap "Add to Home screen"</li>
                <li>Tap "Add" to confirm</li>
              </ol>
            </div>
          </div>
        </div>

        <Button
          onClick={onClose}
          className="w-full min-h-12 text-base font-bold"
          data-testid="button-okay"
        >
          Okay
        </Button>
      </DialogContent>
    </Dialog>
  );
}
