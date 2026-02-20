-- Create Platform Settings Table
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id integer PRIMARY KEY DEFAULT 1,
    maintenance_mode boolean DEFAULT false,
    new_signups boolean DEFAULT true,
    strict_anti_cheat boolean DEFAULT true,
    email_notifications boolean DEFAULT true,
    marketing_emails boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Ensure only one row exists (id = 1)
INSERT INTO public.platform_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- Anyone can READ the platform settings (so the app knows if maintenance is on)
CREATE POLICY "platform_settings_read_all"
    ON public.platform_settings FOR SELECT
    USING (true);

-- Only Admins can UPDATE the platform settings
CREATE POLICY "platform_settings_update_admin"
    ON public.platform_settings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
