import { LegalPage, LegalSection, legalMetadata } from "../_components/legal-page";
import { LegalContact } from "../_components/legal-contact";

/**
 * Terms & Conditions.
 *
 * PORTED VERBATIM from the live site (`app/terms-condition/page.tsx` in the Next
 * repo). This is legal text — restyle it freely, but do not reword, reorder,
 * renumber or summarise any of it. The port was done mechanically for exactly
 * that reason: every `className` was stripped and nothing else was touched, and
 * the visible text was diffed against the source afterwards (36,949 characters,
 * identical). Styling now comes from `LEGAL_BODY` in `legal-page.tsx`.
 *
 * The 16 section ids are the live site's too, so any existing deep link into a
 * clause still resolves.
 */

const TITLE = "Terms & Conditions";
const LEDE =
  "Welcome to Mineral View. Please read these terms and conditions carefully before using our services. By accessing our website, creating an account, or purchasing any plan, you agree to be bound by these terms.";

/** The live site's stated effective date, not a build timestamp. */
const UPDATED = "March 18, 2026";

export const metadata = legalMetadata(TITLE, LEDE);

const SECTIONS = [
  { id: "introduction-acceptance", label: "1. INTRODUCTION AND ACCEPTANCE OF TERMS" },
  { id: "professional-disclaimers", label: "2. PROFESSIONAL DISCLAIMERS AND LIMITATIONS OF DATA" },
  { id: "ai-data-science-disclaimer", label: "3. AI, DATA SCIENCE, AND AUTOMATED SYSTEM DISCLAIMER" },
  { id: "elaborated-disclosures", label: "4. ELABORATED DISCLOSURES FOR EXCLUSIVE FEATURES" },
  { id: "policies-subscription", label: "5. POLICIES AND SUBSCRIPTION TERMS" },
  { id: "data-purchase-licensing", label: "6. DATA PURCHASE AND LICENSING TERMS" },
  { id: "user-responsibilities-risk", label: "7. USER RESPONSIBILITIES AND ASSUMPTION OF RISK" },
  { id: "payment-security-fraud", label: "8. PAYMENT SECURITY AND FRAUD PREVENTION" },
  { id: "data-ownership-intellectual-property", label: "9. DATA OWNERSHIP AND INTELLECTUAL PROPERTY" },
  { id: "service-availability-technology", label: "10. SERVICE AVAILABILITY AND TECHNOLOGY LIMITATIONS" },
  { id: "limitation-liability-disclaimer", label: "11. LIMITATION OF LIABILITY AND DISCLAIMER OF WARRANTIES" },
  { id: "indemnification-release", label: "12. INDEMNIFICATION AND RELEASE" },
  { id: "dispute-resolution-legal-governance", label: "13. DISPUTE RESOLUTION AND LEGAL GOVERNANCE" },
  { id: "privacy-data-protection", label: "14. PRIVACY AND DATA PROTECTION" },
  { id: "general-legal-provisions", label: "15. GENERAL LEGAL PROVISIONS" },
  { id: "copyright-complaints-dmca", label: "16. COPYRIGHT COMPLAINTS (DMCA POLICY)" },
];

export default function TermsConditionsPage() {
  return (
    <LegalPage title={TITLE} lede={LEDE} updated={UPDATED} sections={SECTIONS}>
        <LegalSection
          id="introduction-acceptance"
          title="1. INTRODUCTION AND ACCEPTANCE OF TERMS"
        >
          <h3>
            1. The Nature of These Terms
          </h3>
          <p>
            These Terms and Conditions constitute a comprehensive set of
            rules governing the relationship between you—the user of this
            informative platform, and{' '}
            <strong>Mineral View, LLC</strong>{' '}
            (&quot;Mineral View,&quot; &quot;we,&quot; &quot;us,&quot; or
            &quot;our&quot;). By accessing, browsing, or utilizing the
            services provided through the website{' '}
            <a
              href="https://www.mineralview.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://www.mineralview.com
            </a>{' '}
            (the &quot;Website&quot; or &quot;Platform&quot;), you are
            confirming that you have read, understood, and agreed to be
            bound by the totality of these Terms and Conditions.
          </p>

          <h3>
            2. Scope of the Platform
          </h3>
          <p>
            Mineral View operates an informational marketplace for mineral
            and operator data. This includes, but is not limited to, the
            sale of data sets, the provision of subscription-based
            analytics, the hosting of a community hub, interactive mapping
            tools, and the generation of predictive models using proprietary
            algorithms and artificial intelligence.
          </p>

          <h3>
            3. Representation and Warranty
          </h3>
          <p>
            By using this Website, you represent and warrant that you are at
            least 18 years of age and possess the legal capacity to enter
            into a binding agreement.{' '}
            <strong>
              If you are using this Website on behalf of a company or legal
              entity, you represent that you have the authority to bind that
              entity to these Terms.{' '}
            </strong>{' '}
            If you do not agree to every provision contained herein, you
            must immediately exit the Website and cease all interaction with
            our tools and data.
          </p>

          <h3>
            4. Electronic Consent
          </h3>
          <p>
            By accessing or using the Platform, you acknowledge and agree to
            receive all agreements, notices, disclosures, statements, and
            other communications electronically. These communications may be
            provided via email, in-platform notifications, or by being
            posted on the Platform.
          </p>
          <p>
            You agree that electronic communications satisfy any legal
            requirement that such communications be in writing. It is your
            responsibility to maintain a valid email address and ensure that
            your contact information remains accurate and up to date in
            order to receive important notifications.
          </p>

          <h3>
            5. Guest Access and Public Features
          </h3>
          <ul>
            <li>
              {' '}
              Certain portions of the Mineral View platform may be
              accessible without account registration. These may include
              informational pages, operator profiles, maps, blogs, glossary
              content, and other educational resources.
            </li>
            <li>
              By accessing or using any part of the Website, including
              features available without registration, you acknowledge that
              you have read, understood, and agree to be bound by these
              Terms and Conditions.
            </li>
            <li>
              All data usage restrictions, intellectual property
              protections, prohibited use provisions, and limitations of
              liability apply equally to registered users and non-registered
              visitors.
            </li>
            <li>
              <strong>
                Public access to content does not grant any ownership rights
                or permission to copy, reproduce, distribute, scrape,
                extract, or commercially exploit any platform data or
                materials.
              </strong>{' '}
            </li>
            <li>
              Mineral View reserves the right, at its sole discretion and
              without prior notice, to modify, restrict, or discontinue
              public access to any portion of the Website, including
              requiring registration for previously available features.
            </li>
          </ul>
        </LegalSection>

        <LegalSection
          id="professional-disclaimers"
          title="2. PROFESSIONAL DISCLAIMERS AND LIMITATIONS OF DATA"
        >
          <h3>
            1. No Professional, Legal, or Financial Advice
          </h3>
          <p>
            Mineral View is a data aggregator and technology provider. We
            are <strong> not</strong> a licensed
            financial advisor, a broker-dealer, an investment firm, a law
            firm, or a certified engineering or geological consultancy.
          </p>
          <ul>
            <li>
              <h4>
                No Legal Advice:
              </h4>
              <p>
                Our lease data, map overlays, and document summaries do not
                constitute a
                <strong>
                  {' '}
                  &quot;Title Opinion.&quot;
                </strong>{' '}
                They are not a substitute for a legal examination of county
                records.
              </p>
            </li>
            <li>
              <h4>
                No Financial Advice:
              </h4>
              <p>
                Projections and cash flow estimates provided on this
                Platform are for educational purposes and should not be used
                as the basis for buying, selling, or trading mineral
                interests.
              </p>
            </li>
            <li>
              <h4>
                No Engineering Advice:
              </h4>
              <p>
                Well production data and probability scoring are based on
                mathematical models and are not a replacement for a
                certified reservoir engineering report.
              </p>
            </li>
            <li>
              <h4>
                No Reliance Clause:
              </h4>
              <p>
                You acknowledge and agree that you will not rely exclusively
                on Mineral View&apos;s data, AI-generated outputs,
                projections, reports, or analytics when making financial,
                legal, acquisition, operational, or other material
                decisions.
              </p>
            </li>
            <p>
              The information provided through the Platform is intended to
              supplement, not replace, independent judgment and professional
              consultation. Users are solely responsible for conducting
              their own due diligence and obtaining appropriate professional
              advice before taking action.
            </p>
            <li>
              <h4>
                No Fiduciary Relationship:
              </h4>
              <p>
                Mineral View does not serve as a fiduciary, broker, advisor,
                consultant, agent, or representative for any user. Use of
                the Platform does not create any partnership, joint venture,
                agency, or fiduciary relationship between Mineral View and
                the user.
              </p>
            </li>
            <li>
              <h4>
                No Investment or Securities Advice
              </h4>
              <p>
                Nothing contained on the Platform constitutes or should be
                construed as investment advice, securities advice, or a
                recommendation or solicitation to buy, sell, hold, or
                otherwise transact in mineral interests or related assets.
                All decisions regarding mineral assets remain solely the
                responsibility of the user.
              </p>
            </li>
          </ul>
          <h3>
            2. User Duty of Care
          </h3>
          <p>
            The data on this Website is provided for informational and
            educational purposes only. You agree that any decision you
            make—financial, legal, or otherwise—as a result of using Mineral
            View data is your sole responsibility. We strongly encourage all
            users to verify our data through independent sources and to
            consult with qualified attorneys, landmen, or engineers before
            committing to any transaction.
          </p>

          <h3>
            3. The &quot;As-Is&quot; Nature of Data
          </h3>
          <p>
            All data available through Mineral View is provided{' '}
            <strong>&quot;as-is&quot; </strong> and{' '}
            <strong>
              &quot; as-available.&quot;
            </strong>{' '}
            We aggregate information from public registries, including the
            Texas Railroad Commission (RRC), county clerks, and third-party
            licensors. Because these public records are often subject to
            delays, human error in filing, or reporting lags, Mineral View
            does not guarantee that the data is 100% accurate, complete, or
            current at any given time.
          </p>

          <h3>
            4. Technology and Analytical Nature of Platform
          </h3>
          <p>
            Mineral View provides data aggregation, artificial
            intelligence–driven analysis, predictive modeling, and other
            advanced analytical tools designed to assist users in evaluating
            mineral assets and related activity. All information, reports,
            projections, and insights generated through the Platform are
            provided for informational and analytical purposes only.
          </p>
          <p>
            The Platform does not provide legal, tax, accounting,
            investment, or financial advice. Users are solely responsible
            for evaluating the accuracy, completeness, and suitability of
            any information for their specific circumstances. Decisions
            regarding leasing, selling, retaining, or otherwise managing
            mineral interests should be made in consultation with qualified
            professional advisors.
          </p>

          <h3>
            5. Industry Professional Users
          </h3>
          <p>
            Mineral View is designed to support a wide range of industry
            professionals, including but not limited to mineral investors,
            landmen, attorneys, engineers, consultants, geologists,
            financial institutions, auditors, and other energy-sector
            specialists.
          </p>
          <p>
            While the Platform provides data analytics, research tools, and
            informational resources intended to assist such professionals in
            their evaluation and research processes, Mineral View does not
            provide professional services on behalf of any user.
          </p>
          <p>
            Use of the Platform by industry professionals does not create
            any advisory, consulting, fiduciary, engineering, legal,
            financial, or agency relationship between Mineral View and the
            user. All professionals accessing the Platform remain solely
            responsible for exercising their own professional judgment,
            conducting independent verification of data, and complying with
            the standards, regulations, and ethical obligations applicable
            to their respective professions.
          </p>
        </LegalSection>

        <LegalSection
          id="ai-data-science-disclaimer"
          title="3. AI, DATA SCIENCE, AND AUTOMATED SYSTEM DISCLAIMER"
        >
          <h3>
            1. AI Output Disclaimer
          </h3>
          <p>
            <strong>
              Mineral View utilizes artificial intelligence, machine
              learning algorithms, and statistical modeling techniques to
              generate insights, summaries, forecasts, probability
              assessments, and other analytical outputs.
            </strong>
          </p>
          <p>
            Such outputs are derived from available data inputs and
            programmed methodologies and may contain inaccuracies,
            omissions, delays, or misinterpretations. Users acknowledge that
            AI-generated content is inherently probabilistic and should not
            be relied upon as definitive or error-free.
          </p>

          <h3>
            2. Predictive Model Limitations
          </h3>
          <p>
            All predictive analyses and forecasts provided through the
            Platform are based on historical data, statistical assumptions,
            and modeling techniques. These projections are forward-looking
            in nature and are subject to market volatility, regulatory
            changes, operational risks, and other uncertainties. Mineral
            View does not guarantee future drilling activity, production
            levels, pricing trends, or financial outcomes.
          </p>

          <h3>
            3. AI Chatbot Disclaimer
          </h3>
          <p>
            The Mineral View chatbot delivers automated responses generated
            by artificial intelligence systems. Responses may be incomplete,
            simplified, outdated, or inaccurate. Chatbot interactions are
            provided for general informational purposes only and do not
            constitute legal, financial, tax, investment, or professional
            advice. Users should independently verify information before
            making decisions.
          </p>

          <h3>
            4. No Warranty of AI System Accuracy
          </h3>
          <p>
            Mineral View makes no representations or warranties, express or
            implied, regarding the accuracy, completeness, reliability, or
            suitability of AI-generated outputs. Use of AI-driven tools and
            automated systems is at the user&apos;s sole discretion and
            risk.
          </p>
        </LegalSection>

        <LegalSection
          id="elaborated-disclosures"
          title="4. ELABORATED DISCLOSURES FOR EXCLUSIVE FEATURES"
        >
          <h3>
            1. MVestimate: 6-Year Earnings and Cashflow Projections
          </h3>
          <p>
            The MVestimate tool provides mathematical projections of
            potential earnings over a six-year horizon.
          </p>

          <ul>
            <li>
              <strong>Basis of Calculation:</strong> The calculations are
              performed using the decline curve analysis method based on the
              historical data of your selected leases and the applicable
              decimal interest. These figures represent a predicted estimate
              and cannot be considered an exact final amount or a guarantee
              of future earnings.
            </li>
            <li>
              <strong>Not a Guarantee:</strong> Because commodity prices are
              volatile and production can be interrupted by operator
              decisions or mechanical failures, these figures are{' '}
              <strong>estimates only</strong>. They
              do not constitute a promise of payment or a bankable
              appraisal.
            </li>
            <li>
              <strong>Variable Factors:</strong> Changes in market price,
              taxation, operator deductions, or well workovers can
              significantly alter the actual cash flow compared to the
              MVestimate.
            </li>
          </ul>

          <h3>
            2. New Well Probability Scoring
          </h3>
          <p>
            Our <b>&quot;New Well Probability&quot;</b> metric represents a
            statistical likelihood of future drilling activity.
          </p>

          <ul>
            <li>
              <strong>Methodology:</strong> This scoring is based on spatial
              analysis of regional permitting trends, historical drilling
              density, and proximity to active operator rigs.
            </li>
            <li>
              <strong>Predictive Nature:</strong> This is a predictive
              metric, not a statement of fact. Mineral View does not
              guarantee that a permit will be filed or that a well will be
              spudded. Environmental, regulatory, or economic changes may
              cause an operator to abandon drilling plans despite a high
              probability score.
            </li>
          </ul>

          <h3>
            3. Community Feature and Forum Interaction
          </h3>
          <p>
            The Community is a platform for peer-to-peer communication.
          </p>

          <ul>
            <li>
              <strong>Third-Party Content:</strong> Information, advice, or
              opinions shared within the forums are provided by users, not
              Mineral View. We do not vet user contributions for accuracy or
              legal compliance.
            </li>
            <li>
              <strong>User Caution:</strong> You should never share
              sensitive personal information or specific financial details
              in the Community forum. Acting on advice found in the forum
              without professional verification is done solely at your own
              risk.
            </li>
          </ul>

          <h3>
            4. Texas Interactive Maps (Leases & Wells)
          </h3>
          <p>
            Our mapping interface provides visual overlays of oil and gas
            activity across the State of Texas.
          </p>

          <ul>
            <li>
              <strong>Visual Reference Only:</strong> These maps are
              intended for quick visual reference. They are not legal
              property descriptions or boundary surveys.
            </li>
            <li>
              <strong>Data Aggregation:</strong> Map data is pulled from the
              <b> Texas Railroad Commission (RRC).</b> Any inaccuracies in
              the original RRC coordinates will be reflected in our maps.
              Mineral View is not responsible for the misidentification of
              property boundaries based on these digital overlays.
            </li>
          </ul>

          <h3>
            5. Artificial Intelligence and Automated Outputs
          </h3>
          <p>
            Mineral View utilizes advanced Artificial Intelligence (AI) to
            summarize documents and provide insights.
          </p>

          <ul>
            <li>
              <strong>Output Accuracy:</strong> AI-generated text is a
              summary of available data and can occasionally produce
              inaccuracies or <strong>&quot;hallucinations.&quot;</strong>
            </li>
            <li>
              <strong>Verification:</strong> You are responsible for
              cross-referencing AI summaries with the original source
              documents provided on the Platform.
            </li>
          </ul>
        </LegalSection>

        <LegalSection
          id="policies-subscription"
          title="5. POLICIES AND SUBSCRIPTION TERMS"
        >
          <h3>
            1. Binding Purchase Agreement
          </h3>
          <p>
            When you complete a checkout on Mineral View, you are entering
            into a binding financial obligation. Upon the successful
            processing of your payment, Mineral View grants you immediate or
            scheduled access to the digital assets or tools purchased.
          </p>

          <h3>
            2. Subscription Structures and Auto-Renewal
          </h3>
          <p>
            Mineral View offers various tiers of access through subscription
            models.
          </p>

          <ul>
            <li>
              <strong>Authorization to Charge:</strong> By subscribing, you
              expressly authorize Mineral View to charge your provided
              payment method <b>(Credit Card or PayPal)</b> at the beginning
              of each billing cycle <strong>(monthly or annually)</strong>{' '}
              until you cancel.
            </li>
            <li>
              <strong>Price Adjustments:</strong> We reserve the right to
              change subscription pricing; however, we will provide you with
              at least 30 days&apos; notice before any price change takes
              effect for your next renewal.
            </li>
          </ul>

          <h3>
            3. The Mineral View Free Plan
          </h3>
          <p>
            Mineral View offers a free plan for new users. This plan is
            designed to allow you to explore the Platform and see how the
            website and its interface work before committing to a purchase.
          </p>

          <ul>
            <li>
              <strong>Limited Access:</strong> The free plan provides very
              limited access to our exclusive features, including restricted
              views of data sets and analytics.
            </li>
            <li>
              <strong>Downloads:</strong> Users can download limited
              reports, such as map reports and lease reports, and may also
              receive a monthly summary report. However, to access full
              reporting and download capabilities for all data sets, you
              should consider upgrading to a premium plan.
            </li>
            <li>
              <strong>Non-Expiry:</strong> Unless otherwise stated, the free
              plan does not automatically convert into a paid subscription;
              it remains a restricted access tier until you choose to
              upgrade.
            </li>
          </ul>

          <h3>
            4. Cancellation and Termination
          </h3>

          <ul>
            <li>
              <strong>User-Initiated Cancellation:</strong> You may cancel
              your subscription at any time through the{' '}
              <b>&quot;Manage Subscription Plan&quot;</b> section of your
              user profile.
            </li>
            <li>
              <strong>End of Term:</strong> Upon cancellation, you will
              retain access to the paid features until the end of the
              current billing cycle.
            </li>
            <li>
              <strong>No Partial Refunds:</strong> Mineral View does not
              provide prorated or partial refunds for the remaining days in
              a subscription period.
            </li>
          </ul>

          <p>
            If you have utilized all available data attempts or search
            limits included in your current premium plan and require
            additional access, you may contact us at any time.
          </p>

          <h3>
            5. No-Return Policy on Digital Assets
          </h3>
          <p>
            Mineral View maintains a strict <b>no-return policy</b> on all
            data purchases and subscriptions. Once digital data has been
            delivered or accessed, the transaction is considered final.
          </p>

          <ul>
            <li>
              <strong>Defective Data:</strong>{' '}
              <em>
                In the event that a data set is incomplete or contains
                errors caused by our processing system, we will provide a
                corrected data set at no additional charge. This is your
                sole and exclusive remedy.
              </em>
            </li>
          </ul>
        </LegalSection>

        <LegalSection
          id="data-purchase-licensing"
          title="6. DATA PURCHASE AND LICENSING TERMS"
        >
          <h3>
            1. License Grant; No Transfer of Ownership
          </h3>

          <ul>
            <li>
              All data, reports, analytics, and related materials made
              available through Mineral View are provided under a limited,
              non-exclusive, non-transferable, revocable license.
            </li>
            <li>
              Any purchase or subscription grants the user the right to
              access and use the data solely in accordance with these Terms.
              Such access constitutes a license and not a sale.
            </li>
            <li>
              Mineral View retains all right, title, and interest, including
              all intellectual property rights, in and to the data,
              platform, and associated materials.
            </li>
          </ul>

          <h3>
            2. Prohibited Uses and Restrictions
          </h3>
          <p>
            Users shall not, directly or indirectly, reproduce, duplicate,
            distribute, publish, transmit, display, modify, create
            derivative works from, reverse engineer, resell, sublicense,
            lease, assign, or otherwise commercially exploit any Mineral
            View data, in whole or in part, except as expressly authorized
            in writing by Mineral View. The data may not be used for any
            unlawful purpose or in violation of these Terms.
          </p>

          <h3>
            3. Anti-Competition and Non-Development Restriction
          </h3>
          <p>
            Users expressly agree not to use Mineral View data, analytics,
            methodologies, or platform outputs to develop, support, enhance,
            or operate any product, service, database, or platform that
            competes, directly or indirectly, with Mineral View. Any attempt
            to replicate, benchmark, or reverse engineer Mineral View&apos;s
            proprietary offerings for competitive purposes is strictly
            prohibited.
          </p>

          <h3>
            4. Enforcement and Legal Remedies
          </h3>
          <p>
            Mineral View reserves all rights to monitor compliance with
            these Terms and to investigate suspected violations. In the
            event of unauthorized use, misuse, or infringement of its data
            or intellectual property, Mineral View reserves the right to
            suspend or terminate access immediately and to pursue all
            available legal and equitable remedies, including injunctive
            relief, damages, and recovery of legal fees to the fullest
            extent permitted by applicable law.
          </p>

          <h3>
            5. Prohibited Activities
          </h3>
          <p>
            Users agree not to engage in any of the following prohibited
            activities while using the Platform:
          </p>

          <ul>
            <li>
              Attempting to scrape, harvest, extract, or collect data using
              automated tools, bots, crawlers, or scripts.
            </li>
            <li>
              Copying, reselling, redistributing, or commercially exploiting
              Platform reports, data, or analytics without written
              authorization.
            </li>
            <li>
              Impersonating any individual, company, or entity.
            </li>
            <li>
              Attempting to gain unauthorized access to systems, servers,
              databases, or network infrastructure.
            </li>
            <li>
              Uploading malicious code, viruses, malware, or engaging in
              activities intended to disrupt or damage the Platform.
            </li>
            <li>
              Using the Platform for unlawful, fraudulent, or deceptive
              purposes.
            </li>
            <li>
              Interfering with or disrupting the integrity, performance, or
              security of the Platform.
            </li>
          </ul>

          <p>
            Mineral View reserves the right to investigate violations and
            suspend or terminate accounts involved in prohibited activities.
          </p>
        </LegalSection>

        <LegalSection
          id="user-responsibilities-risk"
          title="7. USER RESPONSIBILITIES AND ASSUMPTION OF RISK"
        >
          <h3>
            1. Assumption of Risk
          </h3>
          <p>
            By accessing or using Mineral View&apos;s platform, data,
            analytics, reports, estimates, projections, or related services,
            the user expressly acknowledges and agrees that:
          </p>

          <ul>
            <li>
              All use of the platform and its content is undertaken at the
              user&apos;s sole discretion and risk.
            </li>
            <li>
              The user assumes full responsibility for any decisions,
              actions, or omissions made in reliance upon information
              obtained through Mineral View.
            </li>
            <li>
              Mineral View shall not be liable for any losses, damages,
              liabilities, or expenses arising from business, financial,
              investment, legal, or operational decisions made based on
              platform data.
            </li>
            <li>
              The platform provides informational resources only and does
              not guarantee financial performance, investment outcomes, or
              operational results.
            </li>
          </ul>

          <h3>
            2. Independent Due Diligence Requirement
          </h3>
          <p>
            Users expressly agree that they are solely responsible for
            conducting appropriate and independent due diligence prior to
            making any financial, legal, investment, acquisition,
            divestiture, operational, or strategic decisions. This includes,
            without limitation:
          </p>

          <ul>
            <li>
              Independently verifying all production data, revenue figures,
              reserve estimates, ownership information, and projections;
            </li>
            <li>
              Consulting qualified legal, financial, tax, engineering, or
              other professional advisors where appropriate;
            </li>
            <li>
              Confirming the accuracy and applicability of data through
              official governmental or regulatory sources; and
            </li>
            <li>
              Evaluating all risks associated with mineral, royalty, or
              energy-related transactions.
            </li>
          </ul>

          <p>
            Mineral View does not provide legal, financial, tax,
            engineering, or investment advice, and no information made
            available through the platform shall be construed as such.
          </p>
        </LegalSection>

        <LegalSection
          id="payment-security-fraud"
          title="8. PAYMENT SECURITY AND FRAUD PREVENTION"
        >
          <h3>
            1. Secure Payment Processing
          </h3>
          <p>
            Mineral View prioritizes the security of your financial data.
          </p>

          <ul>
            <li>
              <strong>Third-Party Gateways:</strong> We utilize
              high-security third-party processors, namely{' '}
              <strong>Cybersource</strong> and <strong>PayPal</strong>, to
              handle all payment data.
            </li>
            <li>
              <strong>No Storage of Card Numbers:</strong> Mineral View does
              not store your full credit card number, expiration date, or
              CVV code on our local servers. This minimizes the risk of data
              breaches affecting your financial information.
            </li>
          </ul>

          <h3>
            2. Fraud Monitoring and Reporting
          </h3>
          <p>
            We actively monitor for fraudulent transactions.
          </p>

          <ul>
            <li>
              <strong>Verification Rights:</strong> We reserve the right to
              delay the delivery of data or access to the Platform until a
              purchase is verified. This may include a request for telephone
              confirmation or identity verification.
            </li>
            <li>
              <strong>Reporting:</strong> Mineral View will report any
              suspected credit card fraud or electronic check fraud to the
              relevant law enforcement agencies and financial institutions.
              We will cooperate fully with authorities to prosecute
              fraudulent actors.
            </li>
          </ul>

          <h3>
            3. Business and Financial Loss Disclaimer
          </h3>
          <p>
            To the fullest extent permitted by applicable law, Mineral View
            shall not be liable for any indirect, incidental, consequential,
            special, exemplary, or punitive damages arising out of or
            related to the use of, or inability to use, the platform or its
            services.
          </p>
          <p>
            Without limitation, Mineral View shall not be responsible for:
          </p>

          <ul>
            <li>
              Lost profits, lost revenue, or anticipated earnings;
            </li>
            <li>
              Investment losses or diminished asset value;
            </li>
            <li>
              Loss of business opportunities, contracts, or goodwill;
            </li>
            <li>
              Operational disruptions or business interruption; or
            </li>
            <li>
              Any other financial or commercial losses, whether foreseeable
              or unforeseeable.
            </li>
          </ul>

          <p>
            Users expressly acknowledge that all business, investment, and
            operational decisions made in reliance upon Mineral View&apos;s
            data or services are undertaken at their sole risk, and Mineral
            View disclaims liability for any resulting financial
            consequences.
          </p>
        </LegalSection>

        <LegalSection
          id="data-ownership-intellectual-property"
          title="9. DATA OWNERSHIP AND INTELLECTUAL PROPERTY"
        >
          <h3>
            1. License, Not Ownership
          </h3>
          <p>
            When you purchase data from Mineral View, you are acquiring a{' '}
            <b>non-exclusive, revocable, non-transferable license</b> to use
            that data for your own internal purposes.
          </p>

          <ul>
            <li>
              <strong>Ownership Rights:</strong> Mineral View, LLC remains
              the sole and exclusive owner of all data sets, algorithms,
              software code, and interface designs on the Platform.
            </li>
            <li>
              <strong>Modifications:</strong> Even if you modify, filter, or
              enhance the data provided by Mineral View, the underlying
              ownership of the original data remains with us.
            </li>
          </ul>

          <h3>
            2. Prohibited Use of Content
          </h3>
          <p>
            Users are strictly prohibited from engaging in the following
            activities:
          </p>

          <ul>
            <li>
              <strong>Resale:</strong> You may not resell, lease, or
              sub-license Mineral View data to any third party.
            </li>
            <li>
              <strong>Scraping:</strong> The use of{' '}
              <strong>&quot;web scrapers,&quot;</strong>{' '}
              <strong>&quot;bots,&quot;</strong> or automated extraction
              tools to harvest data from our Platform is strictly forbidden.
            </li>
            <li>
              <strong>Reverse Engineering:</strong> You may not attempt to
              reverse engineer our proprietary algorithms, including the
              MVestimate or Probability Scoring models.
            </li>
            <li>
              <strong>Branding:</strong> You may not use the Mineral View
              name or logo in any way that implies an endorsement or
              partnership without our express written consent.
            </li>
          </ul>

          <h3>
            3. User-Uploaded Content
          </h3>
          <p>
            By uploading documents or interest data to your account, you
            grant Mineral View the right to process that information to
            generate your personalized dashboards.
          </p>

          <ul>
            <li>
              <strong>Confidentiality:</strong> We handle your uploaded data
              in accordance with our Privacy Policy.
            </li>
            <li>
              <strong>Aggregated Data:</strong> We may use de-identified,
              aggregated versions of user data for the purpose of improving
              our predictive models and overall Platform performance.
            </li>
          </ul>

          <h3>
            4. Third-Party Data Source Disclaimer
          </h3>
          <p>
            Mineral View aggregates, compiles, and presents information
            obtained from various public records, governmental agencies,
            regulatory bodies, and other third-party data providers. While
            we strive to source information from reputable and reliable
            channels, Mineral View does not control, audit, or independently
            verify the accuracy, reliability, or integrity of data supplied
            by such external sources.
          </p>
          <p>
            Accordingly, Mineral View shall not be held liable for any
            errors, omissions, inaccuracies, delays, or inconsistencies
            arising from or attributable to third-party data providers or
            public records.
          </p>

          <h3>
            5. No Guarantee of Completeness or Accuracy
          </h3>
          <p>
            All information made available through Mineral View is provided
            on an <b>&quot;as-is&quot;</b> and{' '}
            <b>&quot;as-available&quot;</b> basis. Mineral View makes no
            representations or warranties, express or implied, regarding the
            completeness, accuracy, reliability, timeliness, or suitability
            of any data, reports, estimates, projections, or other
            information presented on the platform.
          </p>
          <p>
            Data may be subject to updates, revisions, reclassifications,
            reporting delays, or clerical errors beyond our control. Users
            acknowledge that the information provided is informational in
            nature and may not reflect the most current developments.
          </p>

          <h3>
            6. User Verification Responsibility
          </h3>
          <p>
            Users expressly acknowledge and agree that they are solely
            responsible for independently reviewing, verifying, and
            validating any data, reports, or information obtained through
            Mineral View prior to making financial, legal, operational, or
            investment decisions.
          </p>
          <p>
            Mineral View does not provide legal, financial, accounting, or
            investment advice. Reliance upon any information provided
            through the platform is undertaken strictly at the user&apos;s
            own risk.
          </p>

          <h3>
            7. Platform Protection and Anti-Extraction Policy
          </h3>
          <p>
            All content, data, analytics, reports, software architecture,
            design elements, and proprietary methodologies available through
            the Mineral View platform are protected by applicable
            intellectual property, trade secret, and unfair competition
            laws.
          </p>
          <p>
            Unauthorized copying, reproduction, modification, distribution,
            transmission, republication, display, mirroring, scraping,
            harvesting, automated extraction, or systematic retrieval of
            data from the platform is strictly prohibited.
          </p>
          <p>
            Without limitation, users shall not:
          </p>

          <ul>
            <li>
              Use bots, spiders, crawlers, scrapers, scripts, or other
              automated tools to access or extract platform data;
            </li>
            <li>
              Circumvent, disable, or interfere with security-related
              features or access controls;
            </li>
            <li>
              Attempt to reverse engineer, decompile, or otherwise derive
              source code or proprietary processes; or
            </li>
            <li>
              Compile or aggregate platform data to create competing
              databases, products, or services.
            </li>
          </ul>

          <p>
            Mineral View reserves the right to implement technical
            safeguards, monitoring mechanisms, and access controls to detect
            and prevent unauthorized activity. Violations may result in
            immediate suspension or termination of access, as well as
            pursuit of civil, criminal, and equitable remedies to the
            fullest extent permitted by law.
          </p>
        </LegalSection>

        <LegalSection
          id="service-availability-technology"
          title="10. SERVICE AVAILABILITY AND TECHNOLOGY LIMITATIONS"
        >
          <h3>
            1. No Guarantee of Continuous Availability
          </h3>
          <p>
            Mineral View endeavors to maintain reliable and consistent
            access to its platform and services; however, uninterrupted,
            secure, or error-free operation cannot be guaranteed. Users
            acknowledge and agree that:
          </p>

          <ul>
            <li>
              <p>
                {' '}
                Access to the platform may be suspended, restricted, or
                interrupted due to scheduled maintenance, system upgrades,
                security enhancements, or technical modifications.
              </p>
            </li>
            <li>
              <p>
                Service availability may be affected by factors beyond
                Mineral View&apos;s reasonable control, including but not
                limited to internet service disruptions, hosting provider
                failures, telecommunications issues, power outages, cyber
                incidents, governmental actions, or force majeure events;
                and Mineral View makes no representation or warranty
                regarding continuous, uninterrupted, or immediate access to
                the platform or its features.
              </p>
              <p>
                Access to the services is provided on an
                <b>&quot;as-available&quot;</b> basis, subject to
                operational and technical constraints.
              </p>
            </li>
          </ul>

          <h3>
            2. Technology Failure and System Limitation Disclaimer
          </h3>
          <p>
            Mineral View shall not be liable for any loss, damage, delay, or
            interruption arising out of or related to:
          </p>

          <ul>
            <li>
              System errors, software defects, bugs, or technical
              malfunctions;
            </li>
            <li>
              Server outages, hosting disruptions, or data transmission
              failures;
            </li>
            <li>
              Data corruption, loss of stored information, or processing
              delays;
            </li>
            <li>
              Cybersecurity incidents, unauthorized access attempts, or
              malicious attacks;
            </li>
            <li>
              Any other technological failure or infrastructure limitation,
              whether foreseeable or unforeseeable.
            </li>
          </ul>

          <p>
            Users acknowledge that digital platforms are inherently subject
            to technological risks, and reliance upon the services is
            undertaken at the user&apos;s own risk.
          </p>
        </LegalSection>

        <LegalSection
          id="limitation-liability-disclaimer"
          title="11. LIMITATION OF LIABILITY AND DISCLAIMER OF WARRANTIES"
        >
          <h3>
            1. Detailed Disclaimer of Warranties
          </h3>
          <p>
            MINERAL VIEW, LLC PROVIDES THE WEBSITE AND ALL SERVICES ON AN
            &quot;AS IS&quot; BASIS. WE MAKE NO REPRESENTATIONS OR
            WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, REGARDING:
          </p>

          <ul>
            <li>
              THE ACCURACY OR RELIABILITY OF DATA PULLED FROM PUBLIC
              REGISTRIES.
            </li>
            <li>
              THE UNINTERRUPTED AVAILABILITY OF THE WEBSITE.
            </li>
            <li>
              THE ABSENCE OF COMPUTER VIRUSES OR HARMFUL COMPONENTS.
            </li>
            <li>
              THE MARKETABILITY OR FITNESS OF THE DATA FOR A SPECIFIC
              FINANCIAL TRANSACTION.
            </li>
          </ul>

          <h3>
            2. Limitation of Damages
          </h3>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, MINERAL VIEW, LLC SHALL
            NOT BE LIABLE FOR ANY DAMAGES OF ANY KIND ARISING FROM THE USE
            OF THE WEBSITE. THIS INCLUDES, BUT IS NOT LIMITED TO:
          </p>

          <ul>
            <li>
              DIRECT OR INDIRECT DAMAGES.
            </li>
            <li>
              INCIDENTAL OR PUNITIVE DAMAGES.
            </li>
            <li>
              CONSEQUENTIAL DAMAGES, INCLUDING LOSS OF PROFITS, LOSS OF
              DATA, OR LOSS OF BUSINESS OPPORTUNITY.
            </li>
          </ul>

          <h3>
            3. Maximum Liability Cap
          </h3>
          <p>
            In the event that Mineral View is found liable for any loss
            despite the limitations above, you agree that our total
            cumulative liability to you for all claims shall not exceed the
            total amount of fees you have paid to Mineral View during the
            twelve (12) months preceding the claim.
          </p>
        </LegalSection>

        <LegalSection
          id="indemnification-release"
          title="12. INDEMNIFICATION AND RELEASE"
        >
          <h3>
            1. Your Obligation to Protect Mineral View
          </h3>
          <p>
            You agree to indemnify, defend, and hold harmless Mineral View,
            LLC, its officers, directors, employees, and agents from and
            against any and all claims, damages, liabilities, and costs
            (including reasonable attorneys&apos; fees) arising out of:
          </p>

          <ul>
            <li>
              Your use of the Website or its data.
            </li>
            <li>
              Your violation of these Terms and Conditions.
            </li>
            <li>
              Your infringement of any third-party intellectual property
              rights.
            </li>
            <li>
              Decisions made by you or third parties based on the
              projections provided by the Platform.
            </li>
          </ul>

          <h3>
            2. Legal Defense
          </h3>
          <p>
            In the event of a legal claim, Mineral View reserves the right
            to assume the exclusive defense and control of the matter. You
            agree to cooperate fully with our legal team in the defense of
            such claims.
          </p>

          <h3>
            3. Effect of Termination
          </h3>
          <p>
            Upon termination of a user account, access to the Platform and
            its services may be immediately suspended or revoked.
          </p>
          <p>
            Any rights granted to the user under these Terms shall cease
            immediately upon termination. Mineral View may retain certain
            data as required for legal, regulatory, or operational purposes.
          </p>
          <p>
            Termination of access shall not affect any provisions of these
            Terms that by their nature should survive termination, including
            but not limited to disclaimers, limitation of liability,
            indemnification, and dispute resolution provisions.
          </p>
        </LegalSection>

        <LegalSection
          id="dispute-resolution-legal-governance"
          title=" 13. DISPUTE RESOLUTION AND LEGAL GOVERNANCE"
        >
          <h3>
            1. Governing Law
          </h3>
          <p>
            These Terms and Conditions shall be governed by, construed, and
            enforced in accordance with the laws of the{' '}
            <b>State of Texas</b>, without regard to its conflict of law
            principles.
          </p>

          <h3>
            2. Binding Arbitration
          </h3>
          <p>
            You agree that any dispute, claim, or controversy arising out of
            or relating to these Terms or the use of the Website will be
            settled by<b> confidential, binding arbitration in Austin,{' '}
            Texas</b>.
          </p>

          <ul>
            <li>
              <strong>Administration:</strong> The arbitration will be
              administered by the
              <b> American Arbitration Association (AAA)</b> under its
              Commercial Arbitration Rules.
            </li>
            <li>
              <strong>Finality:</strong> The arbitrator&apos;s decision
              shall be final and binding, and judgment on the award may be
              entered in any court having jurisdiction.
            </li>
          </ul>

          <h3>
            3. Waiver of Jury Trial and Class Action
          </h3>
          <p>
            By using this Website, you are knowingly and voluntarily waiving
            your right to a trial by jury. Furthermore, you agree that all
            claims must be brought in your individual capacity. You waive
            any right to participate as a member of a{' '}
            <b>class action lawsuit</b> or any other representative
            proceeding.
          </p>

          <h3>
            4. One-Year Statute of Limitations
          </h3>
          <p>
            You agree that any claim or cause of action arising out of your
            use of the Website must be filed within <b>one (1) year </b>
            after such claim or cause of action arose. If a claim is not
            filed within this one-year period, it is forever barred, and you
            forfeit all rights to pursue that claim.
          </p>
        </LegalSection>

        <LegalSection
          id="privacy-data-protection"
          title="14. PRIVACY AND DATA PROTECTION"
        >
          <h3>
            1. Incorporation of Privacy Policy
          </h3>
          <p>
            Your use of the Website is also governed by our Privacy Policy,
            which is incorporated into these Terms by reference.
          </p>

          <ul>
            <li>
              <strong>Data Collection:</strong> We collect personally
              identifiable information (such as your name and billing
              address) to process your orders.
            </li>
            <li>
              <strong>Usage Tracking:</strong> We may collect non-personal
              information about your visit to help us optimize the
              Platform&apos;s performance and security.
            </li>
            <li>
              <strong>Security Disclaimer:</strong> While we use
              industry-standard encryption, no transmission over the
              internet is 100% secure. You assume the risk of any data
              transmission to the Website.
            </li>
          </ul>

          <h3>
            2. Account Responsibility and Security
          </h3>
          <p>
            Users are solely responsible for maintaining the confidentiality
            and security of their account credentials, including usernames,
            passwords, and any multi-factor authentication mechanisms. Users
            agree to:
          </p>

          <ul>
            <li>
              Ensure that login credentials are not shared, disclosed, or
              made accessible to any unauthorized third party;
            </li>
            <li>
              Promptly notify Mineral View of any suspected or actual
              unauthorized access, security breach, or misuse of their
              account;
            </li>
            <li>
              Accept full responsibility for all activities conducted under
              their account, whether authorized or unauthorized, unless
              resulting solely from Mineral View&apos;s gross negligence or
              willful misconduct; and
            </li>
            <li>
              Maintain accurate and current account information at all
              times.
            </li>
          </ul>

          <p>
            Mineral View shall not be liable for any loss or damage arising
            from a user&apos;s failure to safeguard account credentials.
          </p>

          <h3>
            3. Abuse, Misuse, and Unauthorized Access Protection
          </h3>
          <p>
            Mineral View reserves the right, in its sole discretion, to
            monitor platform usage to ensure compliance with these Terms.
            The Company may suspend, restrict, or permanently terminate
            access to any account engaged in, or reasonably suspected of
            engaging in, including but not limited to:
          </p>

          <ul>
            <li>
              Data scraping, automated extraction, crawling, or harvesting
              of platform content;
            </li>
            <li>
              Circumvention of access controls, usage limits, or security
              measures;
            </li>
            <li>
              Unauthorized copying, downloading, or systematic retrieval of
              data;
            </li>
            <li>
              Use of bots, scripts, or other automated tools to access or
              extract data; or
            </li>
            <li>
              Any activity that compromises platform integrity, performance,
              or security.
            </li>
          </ul>

          <p>
            Mineral View further reserves the right to pursue all available
            legal and equitable remedies in response to abusive or
            unauthorized conduct.
          </p>

          <h3>
            4. Export Control and Sanctions Compliance
          </h3>
          <p>
            Users represent and warrant that they are not located in, under
            the control of, or a national or resident of any country subject
            to U.S. government embargoes, sanctions, or trade restrictions.
          </p>
          <p>
            Users further represent that they are not listed on any U.S.
            government restricted or prohibited party lists, including but
            not limited to the
            <b>
              {' '}
              U.S. Department of Treasury&apos;s Office of Foreign Assets
              Control (OFAC) list,
            </b>{' '}
            the <b>U.S. Department of Commerce Denied Persons List</b>, or
            similar government watch lists.
          </p>
          <p>
            The Platform may not be used in violation of any applicable U.S.
            export control laws or regulations.
          </p>
        </LegalSection>

        <LegalSection
          id="general-legal-provisions"
          title="15. GENERAL LEGAL PROVISIONS"
        >
          <h3>
            1. Force Majeure
          </h3>
          <p>
            Mineral View will not be held liable for any failure to perform
            its obligations if such failure is the result of a{' '}
            <b>&quot;Force Majeure&quot;</b> event. This includes, but is
            not limited to, acts of God, war, terrorism, pandemics, strikes,
            power outages, internet service provider failures, or government
            mandates.
          </p>

          <h3>
            2. No Waiver of Rights
          </h3>
          <p>
            If Mineral View fails to enforce any specific provision of these
            Terms, it does not constitute a waiver of our right to enforce
            that provision—or any other provision—in the future.
          </p>

          <h3>
            3. Severability of Terms
          </h3>
          <p>
            If any section of these Terms is found by a court of competent
            jurisdiction or an arbitrator to be invalid or unenforceable,
            the remaining sections of the Terms shall remain in full force
            and effect. The invalid section will be replaced with a valid
            provision that most closely reflects the original intent.
          </p>

          <h3>
            4. No Assignment
          </h3>
          <p>
            You may not assign or transfer your rights or obligations under
            these Terms to any third party without our prior written
            consent. Mineral View may assign its rights under these Terms at
            its sole discretion, including in the event of a merger or sale
            of assets.
          </p>

          <h3>
            5. Modifications to the Terms
          </h3>
          <p>
            Mineral View reserves the right to modify these Terms and
            Conditions at any time. Changes will be posted on this page with
            an updated &quot;Last Updated&quot; date. Your continued use of
            the Website following the posting of changes constitutes your
            acceptance of the new Terms.
          </p>

          <h3>
            6. Entire Understanding
          </h3>
          <p>
            These Terms and Conditions, along with the Privacy Policy,
            represent the entire understanding between you and Mineral View
            regarding the use of the Website. They supersede all prior
            discussions, emails, or informal agreements.
          </p>
        </LegalSection>

        <LegalSection
          id="copyright-complaints-dmca"
          title="16. COPYRIGHT COMPLAINTS (DMCA POLICY)"
        >
          <p>
            Mineral View respects the intellectual property rights of others
            and expects users of the Platform to do the same.
          </p>
          <p>
            If you believe that content available on the Platform infringes
            your copyright, you may submit a written notification in
            accordance with the{' '}
            <strong>Digital Millennium Copyright Act (DMCA)</strong>.
          </p>
          <p>
            A valid DMCA notice must include:
          </p>

          <ul>
            <li>
              Identification of the copyrighted work claimed to be
              infringed.
            </li>
            <li>
              Identification of the material claimed to be infringing and
              its location on the Platform.
            </li>
            <li>
              Your name, address, telephone number, and email address.
            </li>
            <li>
              A statement that you have a good-faith belief that the
              disputed use is not authorized by the copyright owner, its
              agent, or the law.
            </li>
            <li>
              A statement that the information in the notice is accurate and
              that you are the copyright owner or authorized to act on
              behalf of the owner.
            </li>
            <li>
              Your physical or electronic signature.
            </li>
          </ul>

          <p>
            DMCA notices can be sent to:{' '}
            <a
              href="mailto:support@mineralview.com"
            >
              support@mineralview.com
            </a>
          </p>
        </LegalSection>

      <LegalContact
        heading="Contact information"
        intro="If you have questions regarding these Terms and Conditions, or if you need to provide legal notice to Mineral View, please use the following contact information:"
      />
    </LegalPage>
  );
}
