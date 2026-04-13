import React, { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { StarIcon } from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RatingModal = ({ isOpen, onClose, targetType, targetId, targetTitle }) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const labels = {
    1: t('very_bad', 'سيء جداً'),
    2: t('bad', 'سيء'),
    3: t('okay', 'مقبول'),
    4: t('good', 'جيد'),
    5: t('excellent', 'ممتاز')
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error(t('select_rating', 'يرجى اختيار تقييم'));
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/ratings`, {
        target_type: targetType,
        target_id: targetId,
        rating,
        comment
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      toast.success(t('rating_submitted', 'تم إرسال التقييم بنجاح'));
      onClose();
    } catch (err) {
      toast.error(t('rating_failed', 'فشل في إرسال التقييم'));
    } finally {
      setSubmitting(false);
    }
  };

  const activeStar = hoveredStar || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 text-center" onClick={e => e.stopPropagation()} data-testid="rating-modal">
        <h3 className="text-lg font-bold text-gray-900 mb-1">{t('rate_experience', 'قيّم تجربتك')}</h3>
        <p className="text-sm text-gray-500 mb-4">{targetTitle}</p>

        {/* Stars */}
        <div className="flex justify-center gap-2 mb-2" data-testid="rating-stars">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-125"
              data-testid={`star-${star}`}
            >
              {star <= activeStar
                ? <StarSolid className="h-10 w-10 text-amber-400" />
                : <StarIcon className="h-10 w-10 text-gray-300" />
              }
            </button>
          ))}
        </div>

        {activeStar > 0 && (
          <p className="text-sm font-medium text-amber-600 mb-4">{labels[activeStar]}</p>
        )}

        {/* Comment */}
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder={t('rating_comment_placeholder', 'أضف تعليقاً (اختياري)...')}
          className="w-full border border-gray-200 rounded-xl p-3 text-sm mb-4 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-amber-300"
          data-testid="rating-comment"
        />

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="flex-1 bg-amber-500 text-white py-2.5 rounded-xl font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
            data-testid="submit-rating"
          >
            {submitting ? '...' : t('submit_rating', 'إرسال التقييم')}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            {t('skip', 'تخطي')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
