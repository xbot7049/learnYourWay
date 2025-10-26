/*
  # Fix Critical RLS Security Issue on Sources Table

  1. Security Fix
    - Enable RLS on the `sources` table (currently DISABLED)
    - This is a critical security vulnerability that was preventing data access
    - Without RLS enabled, the table policies are not enforced

  2. Important Notes
    - The migration file already has the correct RLS policies defined
    - However, RLS was not enabled on the sources table
    - This migration ensures RLS is properly enabled
*/

-- CRITICAL FIX: Enable RLS on sources table
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

-- Verify that all policies still exist (they should already be there from the initial migration)
-- But we'll recreate them to ensure they're active

-- Sources policies
DROP POLICY IF EXISTS "Users can view sources from their notebooks" ON public.sources;
CREATE POLICY "Users can view sources from their notebooks"
    ON public.sources FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.notebooks 
            WHERE notebooks.id = sources.notebook_id 
            AND notebooks.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create sources in their notebooks" ON public.sources;
CREATE POLICY "Users can create sources in their notebooks"
    ON public.sources FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.notebooks 
            WHERE notebooks.id = sources.notebook_id 
            AND notebooks.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update sources in their notebooks" ON public.sources;
CREATE POLICY "Users can update sources in their notebooks"
    ON public.sources FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.notebooks 
            WHERE notebooks.id = sources.notebook_id 
            AND notebooks.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete sources from their notebooks" ON public.sources;
CREATE POLICY "Users can delete sources from their notebooks"
    ON public.sources FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.notebooks 
            WHERE notebooks.id = sources.notebook_id 
            AND notebooks.user_id = auth.uid()
        )
    );
