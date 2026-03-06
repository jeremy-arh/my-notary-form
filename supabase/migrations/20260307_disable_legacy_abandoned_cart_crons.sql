-- Désactive les anciens cron jobs "panier abandonné" (séquences en dur)
-- Les séquences sont maintenant gérées par Inngest + automation_sequences (webhook submission-created)
-- Voir docs/SEQUENCES_AUTOMATION.md

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-abandoned-cart-sms') THEN
    PERFORM cron.unschedule('send-abandoned-cart-sms');
    RAISE NOTICE 'Cron send-abandoned-cart-sms désactivé';
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-abandoned-cart-emails') THEN
    PERFORM cron.unschedule('send-abandoned-cart-emails');
    RAISE NOTICE 'Cron send-abandoned-cart-emails désactivé';
  END IF;
END $$;
