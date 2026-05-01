import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../App';
import {
  XMarkIcon,
  CheckCircleIcon,
  HomeIcon,
  UserPlusIcon,
  PaperAirplaneIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const STEPS = [
  {
    title: 'أهلاً بكِ في HomeMe!',
    subtitle: 'خلينا نساعدك تبدأي خلال 3 خطوات سريعة',
    icon: SparklesIcon,
    cta: 'يلا نبدأ ✨',
    href: null,
    body: (
      <ul className="text-sm text-gray-700 space-y-2 mt-3">
        <li className="flex items-center gap-2"><span>✅</span> تأكيد بيانات المجمع</li>
        <li className="flex items-center gap-2"><span>✅</span> إضافة أول وحدة وساكن</li>
        <li className="flex items-center gap-2"><span>✅</span> إرسال أول دعوة بالرابط</li>
      </ul>
    ),
  },
  {
    title: 'الخطوة 1️⃣: بيانات المجمع',
    subtitle: 'تأكدي إن اسم وعنوان المجمع صحيحين',
    icon: HomeIcon,
    cta: 'افتحي إعدادات المجمع',
    href: '/app/compound',
    body: <p className="text-sm text-gray-700 mt-3">من صفحة "إدارة المجمع" تقدري تعدّلي الاسم، العنوان، إجمالي الوحدات، والقواعد العامة.</p>,
  },
  {
    title: 'الخطوة 2️⃣: أول ساكن',
    subtitle: 'سجلي أول وحدة في مجمعك',
    icon: UserPlusIcon,
    cta: 'افتحي إدارة المستخدمين',
    href: '/app/admin/users',
    body: <p className="text-sm text-gray-700 mt-3">أضيفي رب الأسرة الأول مع رقم الوحدة. هتقدري بعدها تبعتي له دعوة بالرابط ليسجل أهل بيته بنفسه.</p>,
  },
  {
    title: 'الخطوة 3️⃣: ابعتي أول دعوة',
    subtitle: 'اختصري الإدخال اليدوي وابعتي رابط',
    icon: PaperAirplaneIcon,
    cta: 'افتحي صفحة الدعوات',
    href: '/app/add-family-member',
    body: <p className="text-sm text-gray-700 mt-3">من صفحة "إضافة فرد للوحدة" اضغطي على زرار "إرسال دعوة بالرابط" بجانب أي وحدة، وهيتولد لينك مع QR Code جاهز للمشاركة.</p>,
  },
  {
    title: 'تمام! 🎉',
    subtitle: 'انتهت الخطوات الأساسية',
    icon: CheckCircleIcon,
    cta: 'إغلاق',
    href: null,
    body: <p className="text-sm text-gray-700 mt-3">لو احتجتي مساعدة في أي وقت، صفحة "تذاكر الدعم الفني" مفتوحة 24/7. كل التوفيق! 💪</p>,
  },
];

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [eligible, setEligible] = useState(false);

  // Only fetch when user is logged in AND on an authenticated /app/* route
  const onAppRoute = location.pathname.startsWith('/app/');

  useEffect(() => {
    if (!user || !user.id || !onAppRoute) return undefined;
    // Skip the generic owner-style onboarding for management-company roles —
    // they have their own dedicated CompoundOnboardingWizard at the dashboard root.
    const role = user.active_role || user.role;
    if (['company_admin', 'assistant_manager', 'accountant', 'super_admin', 'app_owner'].includes(role)) {
      return undefined;
    }
    let alive = true;
    (async () => {
      try {
        const res = await axios.get(`${API}/onboarding/state`, auth());
        if (!alive) return;
        if (res.data?.should_show) {
          setShow(true);
          setStep(res.data.step || 0);
          setEligible(true);
        }
      } catch {
        // silent — onboarding is non-critical
      }
    })();
    return () => { alive = false; };
  }, [user, onAppRoute]);

  const persistStep = async (s, completed = false) => {
    try { await axios.post(`${API}/onboarding/advance`, { step: s, completed }, auth()); }
    catch { /* silent */ }
  };

  const next = async () => {
    const cur = STEPS[step];
    if (cur.href) navigate(cur.href);
    if (step >= STEPS.length - 1) {
      await persistStep(STEPS.length - 1, true);
      toast.success('تم إكمال الإعداد الأولي 🎉');
      setShow(false);
      return;
    }
    const newStep = step + 1;
    setStep(newStep);
    await persistStep(newStep);
  };

  const skip = async () => {
    try { await axios.post(`${API}/onboarding/dismiss`, {}, auth()); } catch {}
    setShow(false);
  };

  if (!show || !eligible || !onAppRoute) return null;
  const cur = STEPS[step];
  const Icon = cur.icon;
  const progress = Math.round(((step) / (STEPS.length - 1)) * 100);

  return (
    <div className="fixed inset-0 z-[125] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4" data-testid="onboarding-wizard">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl">
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{cur.title}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{cur.subtitle}</p>
              </div>
            </div>
            <button onClick={skip} className="text-gray-400 hover:text-gray-700 p-1" data-testid="onboarding-skip">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {cur.body}

          {/* dots */}
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-blue-600' : 'w-1.5 bg-gray-300'}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 mt-5">
            <button onClick={skip} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2" data-testid="onboarding-dismiss">
              تخطي للأبد
            </button>
            <button
              onClick={next}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg flex items-center gap-1.5"
              data-testid="onboarding-next"
            >
              {cur.cta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
