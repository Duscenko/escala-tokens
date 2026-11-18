# Approval batches

Why this file exists: 43 pieces sit at stage `storybook` and none has reached `approved`, so the sync agent, the Figma docs and the web release have nothing to work on (review of 2026-11-18, flag 4). Approval stays the owner's decision (`escala-governance` step 3). This file only orders the work so each batch is small and its dependencies are approved first.

## Rules

1. **Components before the blocks that use them.** A block is approved only when every component it imports is `approved` or `published`. Dependencies were read from the block files (`src/components/escala-ui/blocks/*.tsx`).
2. **A family travels together.** Approving a root approves its parts on the same Figma page (e.g. `Modal` with `ModalHeader` and `ModalFooter`).
3. **One batch at a time.** The next batch opens when the current one is `approved`.
4. **Not in the registry yet = register first.** 30 components in these batches have a contract but no registry entry. Before review, add the entry at stage `storybook` with its story id (below) and the Figma set node id (read with `use_figma`; the contract only holds the page node).

## Per-piece checklist (governance step 3)

- [ ] 0 `Open` findings of severity `error` for the piece
- [ ] All states and variants in the story match the Figma set (axes from the contract)
- [ ] Light and Dark
- [ ] Desktop, Tablet and Mobile (`dimensions` global)
- [ ] Keyboard and focus order; accessible name on every control
- [ ] Motion: the `Motion` story with full and reduced motion, or the contract says `none`
- [ ] Story tag changed to `stage:approved`, registry stage `approved`, PR merged

## Batches

### Batch 1 · Actions core

| Piece | In registry | Story | Contract |
| --- | --- | --- | --- |
| Button | yes | `buttons-button--playground` | `spec/contracts/Button.json` |
| IconButton | no | `buttons-iconbutton--playground` | `spec/contracts/IconButton.json` |
| SocialLoginButton | yes | `buttons-socialloginbutton--playground` | `spec/contracts/SocialLoginButton.json` |
| TextLink | no | `buttons-textlink--playground` | `spec/contracts/TextLink.json` |
| CloseButton | no | `buttons-closebutton--playground` | `spec/contracts/CloseButton.json` |

### Batch 2 · Fields and containers for Auth

| Piece | In registry | Story | Contract |
| --- | --- | --- | --- |
| Field | no | `forms-field--playground` | `spec/contracts/Field.json` |
| Input | no | `forms-input--playground` | `spec/contracts/Input.json` |
| InputOTP | no | `forms-inputotp--playground` | `spec/contracts/InputOTP.json` |
| PasswordStrength | no | `forms-passwordstrength--playground` | `spec/contracts/PasswordStrength.json` |
| Checkbox | no | `forms-checkbox--playground` | `spec/contracts/Checkbox.json` |
| SegmentedControl | no | `navigation-segmentedcontrol--playground` | `spec/contracts/SegmentedControl.json` |
| Separator | no | `content-surfaces-separator--playground` | `spec/contracts/Separator.json` |
| Alert | no | `feedback-alert--playground` | `spec/contracts/Alert.json` |
| FeaturedIcon | yes | `indicators-featuredicon--playground` | `spec/contracts/FeaturedIcon.json` |
| Modal | no | `content-surfaces-modal--playground` | `spec/contracts/Modal.json` |

### Batch 3 · Auth blocks

| Piece | In registry | Story | Contract |
| --- | --- | --- | --- |
| AuthAccountLocked | yes | `blocks-auth-accountlocked--playground` | `blocks/*.contract.json` |
| AuthCheckEmail | yes | `blocks-auth-checkemail--playground` | `blocks/*.contract.json` |
| AuthError | yes | `blocks-auth-error--playground` | `blocks/*.contract.json` |
| AuthForgotPassword | yes | `blocks-auth-forgotpassword--playground` | `blocks/*.contract.json` |
| AuthMagicLinkSent | yes | `blocks-auth-magiclinksent--playground` | `blocks/*.contract.json` |
| AuthNewPassword | yes | `blocks-auth-newpassword--playground` | `blocks/*.contract.json` |
| AuthOTPVerification | yes | `blocks-auth-otpverification--playground` | `blocks/*.contract.json` |
| AuthSignIn | yes | `blocks-auth-signin--playground` | `blocks/*.contract.json` |
| AuthSignInPhone | yes | `blocks-auth-signinphone--playground` | `blocks/*.contract.json` |
| AuthSignUp | yes | `blocks-auth-signup--playground` | `blocks/*.contract.json` |
| AuthSocialSignIn | yes | `blocks-auth-socialsignin--playground` | `blocks/*.contract.json` |
| AuthTwoFactor | yes | `blocks-auth-twofactor--playground` | `blocks/*.contract.json` |

### Batch 4 · Components for Overlay blocks

| Piece | In registry | Story | Contract |
| --- | --- | --- | --- |
| Avatar | no | `content-surfaces-avatar--playground` | `spec/contracts/Avatar.json` |
| Badge | no | `indicators-badge--playground` | `spec/contracts/Badge.json` |
| Chip | no | `indicators-chip--playground` | `spec/contracts/Chip.json` |
| NumberInput | no | `forms-numberinput--playground` | `spec/contracts/NumberInput.json` |
| RadioGroup | no | `forms-radiogroup--playground` | `spec/contracts/RadioGroup.json` |
| RatingGroup | no | `indicators-ratinggroup--playground` | `spec/contracts/RatingGroup.json` |
| Sheet | no | `content-surfaces-sheet--playground` | `spec/contracts/Sheet.json` |
| Slider | no | `forms-slider--playground` | `spec/contracts/Slider.json` |
| Switch | no | `forms-switch--playground` | `spec/contracts/Switch.json` |
| Textarea | no | `forms-textarea--playground` | `spec/contracts/Textarea.json` |

### Batch 5 · Overlay blocks

| Piece | In registry | Story | Contract |
| --- | --- | --- | --- |
| ConfirmDialog | yes | `blocks-overlay-confirmdialog--playground` | `blocks/*.contract.json` |
| DestructiveConfirm | yes | `blocks-overlay-destructiveconfirm--playground` | `blocks/*.contract.json` |
| FormModal | yes | `blocks-overlay-formmodal--playground` | `blocks/*.contract.json` |
| SuccessModal | yes | `blocks-overlay-successmodal--playground` | `blocks/*.contract.json` |
| ErrorModal | yes | `blocks-overlay-errormodal--playground` | `blocks/*.contract.json` |
| FeedbackRating | yes | `blocks-overlay-feedbackrating--playground` | `blocks/*.contract.json` |
| WarningDialog | yes | `blocks-overlay-warningdialog--playground` | `blocks/*.contract.json` |
| ShareModal | yes | `blocks-overlay-sharemodal--playground` | `blocks/*.contract.json` |
| SessionTimeoutWarning | yes | `blocks-overlay-sessiontimeoutwarning--playground` | `blocks/*.contract.json` |
| CartDrawer | yes | `blocks-overlay-cartdrawer--playground` | `blocks/*.contract.json` |
| QuickEditDialog | yes | `blocks-overlay-quickeditdialog--playground` | `blocks/*.contract.json` |
| FilterDrawer | yes | `blocks-overlay-filterdrawer--playground` | `blocks/*.contract.json` |
| FilterModal | yes | `blocks-overlay-filtermodal--playground` | `blocks/*.contract.json` |
| ReleaseModal | yes | `blocks-overlay-releasemodal--playground` | `blocks/*.contract.json` |
| CookieConsent | yes | `blocks-overlay-cookieconsent--playground` | `blocks/*.contract.json` |

### Batch 6 · Components for Navigation blocks

| Piece | In registry | Story | Contract |
| --- | --- | --- | --- |
| AccountMenuTrigger | no | `navigation-accountmenutrigger--playground` | `spec/contracts/AccountMenuTrigger.json` |
| Brand | no | `navigation-brand--playground` | `spec/contracts/Brand.json` |
| Breadcrumb | no | `navigation-breadcrumb--playground` | `spec/contracts/Breadcrumb.json` |
| DropdownMenu | no | `navigation-dropdownmenu--playground` | `spec/contracts/DropdownMenu.json` |
| NavItem | no | `navigation-navitem--playground` | `spec/contracts/NavItem.json` |
| Sidebar | no | `navigation-sidebar--playground` | `spec/contracts/Sidebar.json` |

### Batch 7 · Navigation blocks

| Piece | In registry | Story | Contract |
| --- | --- | --- | --- |
| AnnouncementBar | yes | `blocks-navigation-announcementbar--playground` | `blocks/*.contract.json` |
| UtilityBar | yes | `blocks-navigation-utilitybar--playground` | `blocks/*.contract.json` |
| AppHeader | yes | `blocks-navigation-appheader--playground` | `blocks/*.contract.json` |
| AppHeaderExtended | yes | `blocks-navigation-appheaderextended--playground` | `blocks/*.contract.json` |
| FloatingHeader | yes | `blocks-navigation-floatingheader--playground` | `blocks/*.contract.json` |
| DualSidebar | yes | `blocks-navigation-dualsidebar--playground` | `blocks/*.contract.json` |
| SidebarStatCard | yes | `blocks-navigation-sidebarstatcard--playground` | `blocks/*.contract.json` |

### Batch 8 · Components for Marketing blocks

| Piece | In registry | Story | Contract |
| --- | --- | --- | --- |
| Accordion | no | `content-surfaces-accordion--playground` | `spec/contracts/Accordion.json` |
| Image | no | `content-surfaces-image--playground` | `spec/contracts/Image.json` |

### Batch 9 · Marketing blocks

| Piece | In registry | Story | Contract |
| --- | --- | --- | --- |
| HeroHeader | yes | `blocks-marketing-heroheader--playground` | `blocks/*.contract.json` |
| FAQSection | yes | `blocks-marketing-faqsection--playground` | `blocks/*.contract.json` |
| PricingCard | yes | `blocks-marketing-pricingcard--playground` | `blocks/*.contract.json` |
| PricingSection | yes | `blocks-marketing-pricingsection--playground` | `blocks/*.contract.json` |
| ContactSection | yes | `blocks-marketing-contactsection--playground` | `blocks/*.contract.json` |
| Footer | yes | `blocks-marketing-footer--playground` | `blocks/*.contract.json` |

## After batch 9

Of the 84 remaining contracts, parts of a root above travel with it (rule 2: `ModalHeader`, `SegmentedControlItem`, `InputOTPSlot`, …). The rest are families no block uses yet (Calendar, Combobox, DatePicker, FileUpload, Pagination, Stepper, Table, TabMenu, Toast, Tooltip, FAB, ButtonGroup, ProgressLine, ProgressCircle, Kbd, ScrollArea, …); they follow one family per batch, in the order of the Figma library pages.
