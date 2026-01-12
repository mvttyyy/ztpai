'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { loopsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Upload, X, Music, Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const GENRES = [
  'Hip Hop',
  'Trap',
  'R&B',
  'Pop',
  'Electronic',
  'House',
  'Techno',
  'Dubstep',
  'Drum & Bass',
  'Lo-Fi',
  'Jazz',
  'Rock',
  'Ambient',
  'World',
  'Other',
];

const KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/flac',
  'audio/aiff',
  'audio/x-aiff',
];

export default function UploadPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    bpm: '',
    key: '',
    genre: '',
  });

  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Login Required</h1>
        <p className="text-muted-foreground mb-6">
          Please log in to upload loops.
        </p>
        <Button onClick={() => router.push('/')}>Go Home</Button>
      </div>
    );
  }

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload MP3, WAV, OGG, FLAC, or AIFF.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large. Maximum size is 50MB.';
    }
    return null;
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const error = validateFile(droppedFile);
      if (error) {
        toast({ title: 'Invalid file', description: error, variant: 'destructive' });
        return;
      }
      setFile(droppedFile);
      if (!formData.title) {
        const nameWithoutExt = droppedFile.name.replace(/\.[^/.]+$/, '');
        setFormData({ ...formData, title: nameWithoutExt });
      }
    }
  }, [formData, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const error = validateFile(selectedFile);
      if (error) {
        toast({ title: 'Invalid file', description: error, variant: 'destructive' });
        return;
      }
      setFile(selectedFile);
      if (!formData.title) {
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
        setFormData({ ...formData, title: nameWithoutExt });
      }
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!file) newErrors.file = 'Please select an audio file';
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.bpm || parseInt(formData.bpm) < 20 || parseInt(formData.bpm) > 300) {
      newErrors.bpm = 'BPM must be between 20 and 300';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file!);
      uploadFormData.append('title', formData.title);
      if (formData.description) uploadFormData.append('description', formData.description);
      uploadFormData.append('bpm', formData.bpm);
      if (formData.key) uploadFormData.append('key', formData.key);
      if (formData.genre) uploadFormData.append('genre', formData.genre);
      if (tags.length > 0) uploadFormData.append('tags', JSON.stringify(tags));

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      await loopsApi.create(uploadFormData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast({
        title: 'Upload successful!',
        description: 'Your loop is being processed and will be available soon.',
      });

      setTimeout(() => {
        router.push(`/profile/${user?.username}`);
      }, 1500);
    } catch (error: any) {
      let errorMessage = 'Please try again';
      
      if (error.response?.data?.message) {
        const message = error.response.data.message;
        if (Array.isArray(message)) {
          errorMessage = message.join('. ');
        } else {
          errorMessage = message;
        }
      }
      
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Upload Loop</h1>
        <p className="text-muted-foreground mt-1">
          Share your beats with the community. All uploads are free to use.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Drop Zone */}
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
            dragActive && 'border-primary bg-primary/5',
            file && 'border-green-500 bg-green-500/5',
            errors.file && 'border-destructive',
            !file && !dragActive && 'border-muted-foreground/25 hover:border-primary/50'
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />

          {file ? (
            <div className="flex items-center justify-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Music className="h-6 w-6 text-green-500" />
              </div>
              <div className="text-left">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium mb-1">Drop your audio file here</p>
              <p className="text-sm text-muted-foreground">
                or click to browse. MP3, WAV, OGG, FLAC, AIFF (max 50MB)
              </p>
            </>
          )}
        </div>
        {errors.file && (
          <p className="text-sm text-destructive mt-1">{errors.file}</p>
        )}

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter loop title"
            className={errors.title ? 'border-destructive' : ''}
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe your loop (optional)"
            rows={3}
          />
        </div>

        {/* BPM, Key, Genre */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bpm">BPM *</Label>
            <Input
              id="bpm"
              type="number"
              min="20"
              max="300"
              value={formData.bpm}
              onChange={(e) => setFormData({ ...formData, bpm: e.target.value })}
              placeholder="120"
              className={errors.bpm ? 'border-destructive' : ''}
            />
            {errors.bpm && (
              <p className="text-sm text-destructive">{errors.bpm}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="key">Key</Label>
            <Select
              value={formData.key}
              onValueChange={(value) => setFormData({ ...formData, key: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="genre">Genre</Label>
            <Select
              value={formData.genre}
              onValueChange={(value) => setFormData({ ...formData, genre: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {GENRES.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags (up to 10)</Label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add a tag..."
              disabled={tags.length >= 10}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddTag}
              disabled={tags.length >= 10}
            >
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  #{tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* License Notice */}
        <div className="bg-muted rounded-lg p-4 text-sm">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Free to Use License</p>
              <p className="text-muted-foreground mt-1">
                By uploading, you confirm that you own the rights to this audio and agree
                to release it under a "Free to Use / No Attribution Required" license.
                Others can use it in their projects without crediting you.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={uploading || !file}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Loop
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
