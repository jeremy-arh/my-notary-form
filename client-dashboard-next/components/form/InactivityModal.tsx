"use client";

import { Icon } from "@iconify/react";
import { useTranslation } from "@/hooks/useTranslation";
import { openCrisp } from "@/lib/utils/crisp";

interface InactivityModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function InactivityModal({ isVisible, onClose }: InactivityModalProps) {
  const { t } = useTranslation();

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"
      data-inactivity-modal
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-fade-in-up"
        data-inactivity-modal
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 transition-colors hover:bg-gray-100"
          aria-label={t("form.inactivityModal.close") || "Close"}
        >
          <Icon icon="heroicons:x-mark" className="h-5 w-5 text-gray-600" />
        </button>

        {/* Deux bulles d'agents qui se chevauchent */}
        <div className="mb-5 flex items-center justify-center pt-2" role="img" aria-label="Notre équipe">
          {/* Bulle gauche */}
          <div className="relative z-0 h-[68px] w-[68px] shrink-0 overflow-hidden rounded-full border-[3px] border-white shadow-md">
            <img
              src="https://imagedelivery.net/l2xsuW0n52LVdJ7j0fQ5lA/fdd2c406-8968-42ec-8ebd-21efcd575d00/public"
              alt=""
              className="h-full w-full object-cover object-center"
            />
          </div>
          {/* Bulle droite */}
          <div className="relative z-10 -ml-5 h-[68px] w-[68px] shrink-0 overflow-hidden rounded-full border-[3px] border-white shadow-md">
            <img
              src="https://imagedelivery.net/l2xsuW0n52LVdJ7j0fQ5lA/36b5466f-9dee-4b88-ac69-83859843f900/public?f=webp,q=80"
              alt=""
              className="h-full w-full object-cover object-center"
            />
          </div>
        </div>

        <div className="flex flex-col items-center text-center">
          <h3 className="mb-2 text-lg font-bold text-gray-900">
            {t("form.inactivityModal.title") || "Need help?"}
          </h3>
          <p className="mb-4 text-sm text-gray-600">
            {t("form.inactivityModal.message") ||
              "Our team is here to help! If you have any questions or need assistance, feel free to contact us."}
          </p>

          <button
            type="button"
            onClick={() => {
              openCrisp();
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:bg-[#1d4ed8] hover:shadow-xl active:bg-[#1e40af]"
          >
            <Icon icon="heroicons:chat-bubble-left-right" className="h-5 w-5" />
            <span>{t("form.inactivityModal.contactUs") || "Contact Us"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
