import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '@/hooks/useToast';
import type { User } from '@/types/user';

interface Props {
  isOpen: boolean;
  user: User;
  onClose: () => void;
}

export function ProfileEditDrawer({ isOpen, user, onClose }: Props) {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('Manila, PH');
  const { push } = useToast();

  const save = () => {
    push({ intent: 'success', message: 'Profile updated' });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] bg-black/40"
          onClick={onClose}
        >
          <motion.aside
            onClick={(e) => e.stopPropagation()}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white p-6 overflow-y-auto"
          >
            <h2 className="font-display text-lg mb-3">Edit profile</h2>

            <label className="block text-xs">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 border border-border rounded-md px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-xs mt-3">
              Location
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full mt-1 border border-border rounded-md px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-xs mt-3">
              Bio
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full mt-1 border border-border rounded-md px-3 py-2 text-sm min-h-[120px]"
              />
            </label>

            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="text-sm px-3 py-1.5 rounded-md hover:bg-surface-0"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="bg-gh-teal text-white text-sm px-4 py-2 rounded-md font-semibold"
              >
                Save
              </button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
