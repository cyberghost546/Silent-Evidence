-- Replace the generic-fiction mood vocabulary with the horror one.
--
-- Old: EPIC, HEARTWARMING, MYSTERIOUS, ACTION, ROMANTIC, COMEDIC, DRAMATIC, DARK
-- New: CREEPY, PARANOID, DISTURBING, ATMOSPHERIC, PSYCHOLOGICAL, SUPERNATURAL,
--      GORE, JUMPSCARE, DARK
--
-- Written by hand because `prisma migrate dev` refuses to run non-interactively
-- when an enum loses variants; the generated SQL would have been identical.
--
-- NO DATA MIGRATION IS NEEDED. Every story in the table uses DARK, verified with
--   SELECT DISTINCT mood FROM story;   -- => DARK
-- and DARK is deliberately carried over into the new set, so no row changes and
-- no value is silently coerced. The seven dropped variants were unused.
--
-- The column stays nullable with no default, exactly as before — only the set of
-- permitted values changes.

-- AlterTable
ALTER TABLE `story` MODIFY `mood` ENUM(
  'CREEPY',
  'PARANOID',
  'DISTURBING',
  'ATMOSPHERIC',
  'PSYCHOLOGICAL',
  'SUPERNATURAL',
  'GORE',
  'JUMPSCARE',
  'DARK'
) NULL;
