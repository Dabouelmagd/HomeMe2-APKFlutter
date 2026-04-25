import React, { useState, useRef } from 'react';
import { useAuth } from '../../App';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { UserIcon, CameraIcon, LockClosedIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Helper: center a square crop on an image
const centerAspectCrop = (mediaWidth, mediaHeight) =>
  centerCrop(
    makeAspectCrop({ unit: '%', width: 80 }, 1, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );

// Convert a completed crop into a cropped image Blob
async function getCroppedBlob(imageEl, cropPct, mimeType = 'image/jpeg') {
  const scaleX = imageEl.naturalWidth / imageEl.width;
  const scaleY = imageEl.naturalHeight / imageEl.height;
  const cropX = (cropPct.x / 100) * imageEl.width * scaleX;
  const cropY = (cropPct.y / 100) * imageEl.height * scaleY;
  const cropW = (cropPct.width / 100) * imageEl.width * scaleX;
  const cropH = (cropPct.height / 100) * imageEl.height * scaleY;
  const outSize = Math.min(512, Math.max(cropW, cropH));
  const canvas = document.createElement('canvas');
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imageEl, cropX, cropY, cropW, cropH, 0, 0, outSize, outSize);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), mimeType, 0.92));
}

const ProfileSettings = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePreview, setProfilePreview] = useState(user?.profile_picture_url || null);

  // Sync preview when user updates (e.g. after save or login from another tab)
  React.useEffect(() => {
    if (!profilePicture) {
      setProfilePreview(user?.profile_picture_url || null);
    }
  }, [user?.profile_picture_url, profilePicture]);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Cropping state
  const [cropSrc, setCropSrc] = useState(null); // data URL of the original file for the cropper
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const imgRef = useRef(null);

  // Tracks if user requested avatar removal (no new picture uploaded)
  const [removeAvatar, setRemoveAvatar] = useState(false);

  const handleRemoveAvatar = () => {
    if (!window.confirm(t('remove_avatar_confirm', 'هل تريدين إزالة الصورة الشخصية والرجوع للأيقونة الافتراضية؟'))) return;
    setProfilePicture(null);
    setProfilePreview(null);
    setRemoveAvatar(true);
    toast.success(t('avatar_marked_for_removal', 'تم وضع علامة الإزالة — اضغطي حفظ التغييرات'));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('full_name', profileData.full_name);
      formData.append('phone', profileData.phone || '');
      // Email is read-only — not sent in the update
      if (profilePicture) {
        formData.append('profile_picture', profilePicture, profilePicture.name || 'avatar.jpg');
      }
      if (removeAvatar) {
        formData.append('remove_avatar', 'true');
      }

      const response = await axios.put(`${API}/users/${user.id}/profile`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      const updatedUser = response.data?.user || response.data;
      updateUser({ ...user, ...updatedUser });
      setProfilePicture(null);
      setRemoveAvatar(false);
      toast.success(t('profile_updated_successfully', 'تم تحديث الملف الشخصي بنجاح'));
    } catch (error) {
      const msg = error?.response?.data?.detail || t('failed_to_update_profile', 'فشل تحديث الملف الشخصي');
      toast.error(typeof msg === 'string' ? msg : t('failed_to_update_profile', 'فشل تحديث الملف الشخصي'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (profileData.new_password !== profileData.confirm_password) {
      toast.error(t('passwords_do_not_match', 'كلمات المرور غير متطابقة'));
      return;
    }

    setSavingPassword(true);
    try {
      await axios.put(`${API}/users/${user.id}/password`, {
        current_password: profileData.current_password,
        new_password: profileData.new_password
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

      toast.success(t('password_updated_successfully', 'تم تحديث كلمة المرور'));
      setProfileData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
    } catch (error) {
      toast.error(error.response?.data?.detail || t('failed_to_update_password', 'فشل تحديث كلمة المرور'));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('please_select_image_file', 'يرجى اختيار ملف صورة'));
      return;
    }
    // Open cropper with the chosen image
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropSrc(ev.target.result);
      setCrop(undefined);
      setCompletedCrop(undefined);
    };
    reader.readAsDataURL(file);
    // Reset input so selecting the same file twice still triggers change
    e.target.value = '';
  };

  const onCropImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height));
  };

  const confirmCrop = async () => {
    if (!imgRef.current || !completedCrop) {
      toast.error(t('crop_first', 'يرجى تحديد منطقة الصورة أولاً'));
      return;
    }
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop, 'image/jpeg');
      if (!blob) throw new Error('no-blob');
      const croppedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      setProfilePicture(croppedFile);
      setProfilePreview(URL.createObjectURL(blob));
      setCropSrc(null);
      toast.success(t('crop_ready', 'تم اقتصاص الصورة — لا تنسي الحفظ'));
    } catch {
      toast.error(t('crop_failed', 'فشل اقتصاص الصورة'));
    }
  };

  const cancelCrop = () => {
    setCropSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Profile Picture & Basic Info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-lg hover:border-rose-200 dark:hover:border-rose-800 transition-all">
        <div className="p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-rose-500" />
            {t('personal_information', 'المعلومات الشخصية')}
          </h3>
          
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            {/* Profile Picture */}
            <div className="flex items-center gap-6">
              <div className="relative">
                {profilePreview ? (
                  <img 
                    src={profilePreview.startsWith('blob:') || profilePreview.startsWith('http') ? profilePreview : `${BACKEND_URL}${profilePreview}`} 
                    alt="Profile" 
                    className="w-24 h-24 rounded-2xl object-cover border-4 border-rose-100 dark:border-rose-900" 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center border-4 border-rose-100 dark:border-rose-900">
                    <UserIcon className="w-12 h-12 text-rose-300 dark:text-rose-700" />
                  </div>
                )}
                <label 
                  htmlFor="profile-picture" 
                  className="absolute -bottom-2 -right-2 bg-rose-500 text-white p-2.5 rounded-xl cursor-pointer hover:bg-rose-600 transition-colors shadow-lg"
                  title={t('change_picture', 'تغيير الصورة')}
                >
                  <CameraIcon className="w-4 h-4" />
                </label>
                {(profilePreview || user?.profile_picture_url) && !removeAvatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute -bottom-2 -left-2 bg-gray-700 hover:bg-red-600 text-white p-2.5 rounded-xl cursor-pointer transition-colors shadow-lg"
                    title={t('remove_picture', 'إزالة الصورة')}
                    data-testid="remove-avatar-btn"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
                <input
                  id="profile-picture"
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-lg">{user?.full_name}</h4>
                <p className="text-gray-500 dark:text-gray-400">@{user?.username}</p>
                <p className="text-xs text-rose-500 mt-1">{t('click_to_change', 'انقر لتغيير الصورة')}</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('full_name', 'الاسم الكامل')}
                </label>
                <input
                  type="text"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('phone_number', 'رقم الهاتف')}
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('email', 'البريد الإلكتروني')}
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  readOnly
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium cursor-not-allowed focus:outline-none"
                  dir="ltr"
                  data-testid="profile-email-input"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">🔒 {t('email_readonly_hint', 'البريد الإلكتروني مرتبط بحسابك — للاستفسار عن تغييره تواصلي مع الدعم الفني')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('role', 'الدور')}
                </label>
                <input
                  type="text"
                  value={user?.role || ''}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed capitalize"
                  disabled
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              data-testid="save-profile-btn"
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-rose-500/25"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <CheckIcon className="w-5 h-5" />
              )}
              <span>{saving ? t('saving', 'جاري الحفظ...') : t('save_changes', 'حفظ التغييرات')}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Password Change */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-lg hover:border-rose-200 dark:hover:border-rose-800 transition-all">
        <div className="p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <LockClosedIcon className="w-5 h-5 text-pink-500" />
            {t('change_password', 'تغيير كلمة المرور')}
          </h3>
          
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('current_password', 'كلمة المرور الحالية')}
              </label>
              <input
                type="password"
                value={profileData.current_password}
                onChange={(e) => setProfileData(prev => ({ ...prev, current_password: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('new_password', 'كلمة المرور الجديدة')}
                </label>
                <input
                  type="password"
                  value={profileData.new_password}
                  onChange={(e) => setProfileData(prev => ({ ...prev, new_password: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('confirm_new_password', 'تأكيد كلمة المرور')}
                </label>
                <input
                  type="password"
                  value={profileData.confirm_password}
                  onChange={(e) => setProfileData(prev => ({ ...prev, confirm_password: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={savingPassword}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-pink-500/25"
            >
              {savingPassword ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <LockClosedIcon className="w-5 h-5" />
              )}
              <span>{savingPassword ? t('updating', 'جاري التحديث...') : t('update_password', 'تحديث كلمة المرور')}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Image Cropper Modal */}
      {cropSrc && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          data-testid="crop-modal"
          onClick={cancelCrop}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <CameraIcon className="w-5 h-5" />
                <h3 className="font-bold">{t('crop_title', 'اقتصاص صورة الملف الشخصي')}</h3>
              </div>
              <button
                type="button"
                onClick={cancelCrop}
                className="text-white/80 hover:text-white text-2xl leading-none"
                data-testid="crop-cancel-x"
              >×</button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-gray-900 flex items-center justify-center" style={{ minHeight: '300px' }}>
              <ReactCrop
                crop={crop}
                onChange={(_, pct) => setCrop(pct)}
                onComplete={(_, pct) => setCompletedCrop(pct)}
                aspect={1}
                circularCrop
                keepSelection
              >
                <img
                  ref={imgRef}
                  src={cropSrc}
                  alt="crop source"
                  onLoad={onCropImageLoad}
                  style={{ maxHeight: '60vh', maxWidth: '100%', display: 'block' }}
                  data-testid="crop-image"
                />
              </ReactCrop>
            </div>
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between gap-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('crop_hint', '💡 اسحبي زوايا المربع لاقتصاص الصورة')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelCrop}
                  className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                  data-testid="crop-cancel"
                >{t('cancel', 'إلغاء')}</button>
                <button
                  type="button"
                  onClick={confirmCrop}
                  disabled={!completedCrop}
                  className="px-5 py-2 text-sm bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg font-bold hover:shadow-lg disabled:opacity-50 flex items-center gap-1"
                  data-testid="crop-confirm"
                >
                  <CheckIcon className="w-4 h-4" />
                  {t('apply_crop', 'تطبيق الاقتصاص')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSettings;
