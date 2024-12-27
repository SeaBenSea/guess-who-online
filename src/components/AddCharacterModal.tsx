'use client';

import { useState } from 'react';
import { CharacterType, NewCharacter } from '@/types/character';

interface AddCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (character: NewCharacter) => void;
}

const CHARACTER_TYPE_LABELS: Record<CharacterType, string> = {
  human_male: 'Human (Male)',
  human_female: 'Human (Female)',
  dog: 'Dog',
  cat: 'Cat',
  bird: 'Bird',
  fish: 'Fish',
  robot: 'Robot',
  alien: 'Alien',
  monster: 'Monster',
  superhero: 'Superhero',
  villain: 'Villain',
  wizard: 'Wizard',
  dragon: 'Dragon',
  unicorn: 'Unicorn',
  other: 'Other',
};

const ALLOWED_IMAGE_DOMAINS = ['i.imgur.com', 'giphy.com', 'upload.wikimedia.org'];

export default function AddCharacterModal({ isOpen, onClose, onSubmit }: AddCharacterModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CharacterType>('other');
  const [imageUrl, setImageUrl] = useState('');
  const [isImageFile, setIsImageFile] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const validateImageUrl = (url: string): boolean => {
    if (!url) return true; // Empty URL is valid
    if (url.startsWith('data:image/')) return true; // Base64 image is valid

    try {
      const parsedUrl = new URL(url);
      return ALLOWED_IMAGE_DOMAINS.some(domain => parsedUrl.hostname.endsWith(domain));
    } catch {
      return false;
    }
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setIsImageFile(false);

    if (url && !validateImageUrl(url)) {
      setUrlError('Please use an image URL from: ' + ALLOWED_IMAGE_DOMAINS.join(', '));
    } else {
      setUrlError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (imageUrl && !validateImageUrl(imageUrl)) {
      return;
    }

    onSubmit({
      name,
      type,
      imageUrl: imageUrl || undefined,
    });
    setName('');
    setType('other');
    setImageUrl('');
    setIsImageFile(false);
    setUrlError(null);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        setUrlError('File size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
        setUrlError(null);
      };
      reader.readAsDataURL(file);
      setIsImageFile(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">Add New Character</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium mb-1">
              Type
            </label>
            <select
              id="type"
              value={type}
              onChange={e => setType(e.target.value as CharacterType)}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(CHARACTER_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Image</label>
            <div className="space-y-2">
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Max file size: 5MB</p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="border-t border-gray-600 w-full"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-gray-800 px-2 text-gray-400">or</span>
                </div>
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Enter image URL"
                  value={isImageFile ? '' : imageUrl}
                  onChange={e => handleUrlChange(e.target.value)}
                  disabled={isImageFile}
                  className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {urlError && <p className="text-xs text-red-400 mt-1">{urlError}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  Supported image hosts: {ALLOWED_IMAGE_DOMAINS.join(', ')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!urlError}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Character
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
