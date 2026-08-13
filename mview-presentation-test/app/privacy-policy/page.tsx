import { LegalPage, LegalSection, legalMetadata } from "../_components/legal-page";
import { LegalContact } from "../_components/legal-contact";

/**
 * Privacy Policy.
 *
 * PORTED VERBATIM from the live site (`app/privacy-policy` in the Next repo).
 * This is legal text — restyle it freely, but do not reword, reorder or
 * summarise any of it. The port was mechanical for that reason: the shadcn
 * `Card`/`Badge`/`Separator` wrappers were unwrapped, every `className` stripped,
 * and the visible text then diffed against the source (8,125 characters,
 * identical). Styling comes from `LEGAL_BODY` in `legal-page.tsx`.
 *
 * The 14 section ids are the live site's, so existing deep links still resolve.
 * The badge grids and bullet arrays are real `<ul>` lists here — they were
 * decorative pills carrying list content.
 */

const TITLE = "Privacy Policy";
const LEDE =
  "How Mineral View collects, uses, shares and protects your information.";

/** The live site's stated effective date, not a build timestamp. */
const UPDATED = "June 1, 2023";

export const metadata = legalMetadata(TITLE, LEDE);

const SECTIONS = [
  { id: "overview", label: "Mineral View Protects Your Privacy" },
  { id: "personal-info", label: "What Personal Information Mineral View Collects?" },
  { id: "non-personal-info", label: "What Non-Personal Information Mineral View Collects?" },
  { id: "data-download", label: "About Data Download" },
  { id: "cookies", label: "Cookies" },
  { id: "email", label: "Email and Promotional Materials" },
  { id: "security", label: "Security of Personal Information" },
  { id: "links", label: "Links to Other Websites" },
  { id: "access", label: "Access, Update, and Correction of Personal Information" },
  { id: "changes", label: "Updates and Changes to Privacy Policy" },
  { id: "deactivation", label: "Revoking Consent or Deactivating Your Account" },
  { id: "children", label: "Children's Privacy" },
  { id: "california", label: "California Shine the Light Law" },
  { id: "governing-law", label: "Governing Law" },
  { id: "contact", label: "Contact Us" },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title={TITLE} lede={LEDE} updated={UPDATED} sections={SECTIONS}>
      <LegalSection id="overview" title="Mineral View Protects Your Privacy">
        <p>
          Mineral View, LLC (&apos;Mineral View&apos;) is committed to safeguarding the privacy and security of its user&apos;s personal information. This Privacy Policy (&apos;Policy&apos;) highlights the types of personal information Mineral View accumulates and how it is utilized, shared, and protected. By using the Mineral View Website, you agree to the terms of this Policy.
        </p>
      </LegalSection>

      <LegalSection id="personal-info" title="What Personal Information Mineral View Collects?">
                    <p>
                      Mineral View collects personal information such as:
                    </p>
                    <div>
                      <ul><li>NAME</li><li>ADDRESS</li><li>EMAIL</li><li>CONTACT DETAILS</li><li>DETAILS OF THE COMPANY</li><li>PAYMENT INFORMATION</li><li>BILLING INFORMATION</li><li>CORRESPONDENCE FROM USERS WHO PROVIDE SUCH INFORMATION</li></ul>
                    </div>

                    <div>
                      <p>
                        Mineral View uses this information to provide its products and
                        services, customer support, dispute resolution,
                        troubleshooting, prevent illegal activities, customise and
                        improve its services and content, and inform users about its
                        products, services, updates and promotional offers.
                      </p>
                      <p>
                        Mineral View never sells or disclose personal information to
                        unaffiliated third parties for marketing purposes. Mineral View may
                        disclose personal information to service providers who help it
                        provide products and services, such as hosting, fulfillment,
                        data processing and storage, and data security. Mineral View requires
                        these service providers to use personal information only for
                        the purposes for which it was provided.
                      </p>
                      <p>
                        Mineral View may disclose personal information when required by law
                        or in good faith when necessary to prevent imminent physical
                        harm or financial loss or to report suspected illegal
                        activity.
                      </p>
                    </div>
                  </LegalSection>

              <LegalSection id="non-personal-info" title="What Non-Personal Information Mineral View Collects?">
                    <p>
                      Mineral View collects non-personal information such as:
                    </p>
                    <div>
                      <ul><li>IP ADDRESS</li><li>BROWSER CHARACTERISTICS</li><li>DEVICE ID</li><li>DEVICE OPERATING SYSTEM</li><li>SYSTEM LANGUAGE PREFERENCES</li><li>REFERRING URLS</li><li>URLS OF WEBSITES VISITED</li><li>TRAFFIC DATA</li><li>LOCATION</li></ul>
                    </div>

                    <div>
                      <p>
                        Mineral View uses cookies to customize user experience, ensure that
                        users do not repeatedly see irrelevant content, and identify
                        users as unique visitors to the Website.
                      </p>
                      <p>
                        Mineral View may use web beacons or clear gifs to track user online
                        movements and the effectiveness of its marketing campaigns.
                        Mineral View may publish traffic data and information gathered using
                        cookies in the aggregate, but it will not include personally
                        identifiable data.
                      </p>
                    </div>
                  </LegalSection>

              <LegalSection id="data-download" title="About Data Download">
                    <p>
                      Mineral View offers the
                      <span>
                        Data Download
                      </span>{' '}
                      alternative, enabling users to download the copy of all the
                      sophisticated data in standard as well as customized format. The
                      data download option aligns with our standard policy without
                      affecting your personalized data. We offer the relevant data by
                      following the user rights and transparency under legal data
                      protection laws.
                    </p>
                    <p>
                      We offer the following data:
                    </p>
                    <ul>
                      <ul><li>Mineral Rolls Data</li><li>Well Data</li><li>Production Data</li></ul>
                    </ul>
                    <p>
                      For quick assistance or solving the doubts and questions about
                      the &apos;Data Download&apos; feature, please share your queries
                      at{' '}
                      <a
                        href="mailto:support@mineralview.com"
                      >
                        support@mineralview.com
                      </a>{' '}
                      Our team professionals resolve your issues promptly and
                      effectively.
                    </p>
                    <aside>
                        <p>
                          The data download option complies with legal data security
                          norms and reflects our commitment to protecting your privacy
                          rights.
                        </p>
                      </aside>
                  </LegalSection>

              <LegalSection id="cookies" title="Cookies">
                    <p>
                      Users may disable cookies in their browser settings, but certain
                      features of the Website may not function properly without
                      cookies.
                    </p>
                  </LegalSection>

              <LegalSection id="email" title="Email and Promotional Materials">
                    <p>
                      By establishing an account, making a purchase, or registering to
                      receive the Mineral View newsletter, users consent to receive periodic
                      commercial or promotional email communications from Mineral View. Users
                      may opt-out of receiving such communications by following the
                      unsubscribe instructions contained in each email, or by
                      contacting Mineral View’s customer service department.
                    </p>
                  </LegalSection>

              <LegalSection id="security" title="Security of Personal Information">
                    <p>
                      Mineral View prioritize securing your personalized data on a primary
                      basis and is committed to protecting it from cyber thefts. Mineral View
                      executes multiple legal and technical measures in order to
                      secure your data against destructions, disclosures, improper
                      utilization, unauthorized accessibility and alteration.
                    </p>
                    <p>
                      Mineral View uses SSL encryption to transmit personal information via
                      secure servers. Mineral View complies with payment card industry data
                      security standards and is a verified Cybersource & Payeezy
                      e-Commerce payment gateway merchant. Mineral View does not have access
                      to users&apos; credit card information, as it is processed securely
                      by Authorize.net following PCI-compliant standards.
                    </p>
                    <p>
                      Mineral View has implemented industry-standard security measures to
                      protect users&apos; personal information during transmission and
                      after receipt. However, no method of transmission over the
                      Internet or Electronic Storage is 100% secure. Users should
                      promptly notify Mineral View if they believe their personal information
                      has been compromised.
                    </p>
                    <aside>

                        <p>
                          Mineral View uses personal information only for purposes stated in
                          this Policy and does not rent or sell it to unaffiliated
                          third parties.
                        </p>
                      </aside>
                  </LegalSection>

              <LegalSection id="links" title="Links to Other Websites">
                    <p>
                      Mineral View may provide links to other third-party Websites whose
                      privacy practices differ from Mineral View&apos;s. Users should
                      carefully read the privacy statement of any third-party Website
                      they visit and submit personal information to.
                    </p>
                  </LegalSection>

              <LegalSection id="access" title="Access, Update, and Correction of Personal Information">
                    <p>
                      Mineral View wants users&apos; personal information to be complete and
                      accurate. Users should promptly update their personal
                      information if changes occur or information is inaccurate. Users
                      may review and change most of their personal information by
                      logging into their account or contacting Mineral View directly.
                    </p>
                  </LegalSection>

              <LegalSection id="changes" title="Updates and Changes to Privacy Policy">
                    <p>
                      Mineral View may update this Privacy Policy at any time by posting
                      additions or modifications on the Website. If at any point we
                      decide to use personal information in a manner materially
                      different from that stated at the time it was collected, we will
                      notify users by email or via a prominent notice on our Website,
                      and where necessary we will seek the prior consent of our users.
                    </p>
                    <aside>

                        <p>
                          It is your responsibility to review this Privacy Policy
                          periodically for any updates or changes. Your continued use
                          of the Website following the posting of any changes to this
                          Privacy Policy constitutes your acceptance of those changes.
                        </p>
                      </aside>
                  </LegalSection>

              <LegalSection id="deactivation" title="Revoking Consent or Deactivating Your Account">
                    <p>
                      You may deactivate or request to deletion of your Mineral View account
                      at your convenience by communicating with us through email
                      <a
                        href="mailto:support@mineralview.com"
                      >
                        support@mineralview.com
                      </a>
                      . When you delete your account, your personal information is
                      removed from our database, unless we are required to save the
                      data by applicable law, to prevent fraud, resolve disputes,
                      troubleshoot problems, assist with investigations and/or enforce
                      our Terms and Conditions.
                    </p>
                    <p>
                      You can access, review and change most of your personal
                      information by logging in to the My Account area at{' '}
                      <a
                        href="https://www.mineralview.com"
                      >
                        https://www.mineralview.com
                      </a>
                      . You are required to promptly update your personal information
                      if changes occur or information is inaccurate.
                    </p>
                  </LegalSection>

              <LegalSection id="children" title="Children's Privacy">
                    <p>
                      Mineral View complies with the Childern&apos;s Online Privacy
                      Protection Act of the United States of America where it applies
                      to our information protection activities. We do not knowingly
                      collect personal information from children under the age of
                      thirteen (13). If we learn that we have inadvertently collected
                      personal information of a child under the age of thirteen (13)
                      without proper consent, we will immediately purge that data from
                      our database.
                    </p>
                  </LegalSection>

              <LegalSection id="california" title="California Shine the Light Law">
                    <p>
                      Mineral View does not share your personal information with third
                      parties for their own marketing use without your permission.
                    </p>
                  </LegalSection>

              <LegalSection id="governing-law" title="Governing Law">
                    <p>
                      This Privacy Policy is governed by and construed in accordance
                      with the laws of the State of Texas, without regard to its
                      conflict of law provisions.
                    </p>
                  </LegalSection>

              <LegalSection id="contact" title="Contact Us">
                    <p>
                      Mineral View LLC owns and operates the{' '}
                      <a
                        href="https://www.mineralview.com"
                      >
                        https://www.mineralview.com
                      </a>
                      .Website. You may contact us directly if you have any questions
                      regarding the content and material on the Website or if you have
                      any questions about our Privacy Policy. Please contact our
                      Compliance Officer at 7301 Ranch Road 620 N Suite 155-194,
                      Austin, TX 78726-4537. Additionally, you may contact your state
                      or local consumer protection office or the Better Business
                      Bureau.
                    </p>
                  </LegalSection>

      <LegalContact
        heading="Contact us about privacy"
        intro="If you have questions about this Privacy Policy or how your information is handled, contact our Compliance Officer:"
      />
    </LegalPage>
  );
}
