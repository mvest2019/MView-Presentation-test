/**
 * FAQ content — the prototype's `MV_FAQ_DB` (route:faq), verbatim.
 *
 * All 85 Q&As carry the old site's wording unchanged, per instruction. The only
 * adaptation is `#/contact` hash links rewritten to the real `/contact` route.
 *
 * ⚠ Known content conflict, kept verbatim to reconcile with the team: the
 * Payments answers describe subscriptions that auto-renew (Wells Fargo
 * Cybersource), while the "Most asked" block says paid plans never auto-renew.
 */

export const FAQ_CATEGORIES = [
  "General",
  "Products",
  "Payments",
  "Pricing",
  "Terminology",
  "Portal Action",
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export interface FaqEntry {
  readonly category: FaqCategory;
  readonly question: string;
  /** Old-site markup preserved — rendered with dangerouslySetInnerHTML. */
  readonly answerHtml: string;
}

/** The hand-picked "Most asked" block — 8 items, shown above the categories. */
export const MOST_ASKED: readonly Omit<FaqEntry, "category">[] = [
  {
    question: "Is Mineral View a broker?",
    answerHtml: `<p>No. We help mineral owners understand public records, activity, monthly production, and estimates so they can make better decisions. We don't buy minerals, we don't sell your information to buyers, and we don't take operator money.</p>`,
  },
  {
    question: "Are your valuations appraisals?",
    answerHtml: `<p>No. Every valuation is a model-based estimate — not a formal appraisal. Every valuation surface is labeled and includes the assumptions used.</p>`,
  },
  {
    question: "Do you sell my data?",
    answerHtml: `<p>No. Owner data is not sold, brokered, or bundled to third parties. Documents you upload are private to you unless you explicitly share them with an advisor — and you can revoke advisor sharing anytime.</p>`,
  },
  {
    question: "What if the public records look wrong?",
    answerHtml: `<p>Use "Report a data issue" anywhere it appears. We review your report and use it to improve your Mineral View record. Public records at the source agency may still need correction with the operator or state — we don't overwrite public records ourselves in v1.</p>`,
  },
  {
    question: "How is Free different from Essentials and Premium?",
    answerHtml: `<p>Free is 1 active owner and 1 visible lease. Essentials is up to 5 visible leases and portfolio exports at $49.95/mo. Premium is up to 10 visible leases, the monthly production mailed report, and the private document vault at $99.95/mo. Enterprise is custom and contact-required. Annual prepay is 10 × monthly — pay for 10 months, get 12: Essentials $499.50/yr, Premium $999.50/yr.</p><p><em>All pricing is illustrative for design review — not yet an offer.</em></p>`,
  },
  {
    question: "Do paid plans auto-renew?",
    answerHtml: `<p>Never. Every paid plan is a 1-year term. We remind you before your end of term; if you do nothing, billing stops and your account moves to Free. Renewing is one click, and referral credits auto-apply at renewal.</p>`,
  },
  {
    question: "Can I switch which owner record is my active one?",
    answerHtml: `<p>Yes. You can deactivate and switch your active owner once every 7 days (cooldown configurable). Enterprise supports custom multi-owner arrangements.</p>`,
  },
  {
    question: "Who can see my private lease group?",
    answerHtml: `<p>Only claimed owners of that lease or unit, plus advisor representatives an owner explicitly brings in — always labeled "Advisor for [Owner]". Operators are never members of private lease groups.</p>`,
  },
];

export const FAQ_ENTRIES: readonly FaqEntry[] = [
  // ——— General (20) ———
  {
    category: "General",
    question: "Where is Mineral View Located?",
    answerHtml: `<p>Mineral View is proudly headquartered in Austin, Texas, a hub for innovation and industry leadership.</p>`,
  },
  {
    category: "General",
    question: "Who is Mineral View?",
    answerHtml: `<p>Mineral View is a family-owned business with decades of experience in the Texas oil and gas industry. We are dedicated to empowering mineral owners by providing them with reliable information to make well-informed decisions regarding their oil and gas leases.</p>`,
  },
  {
    category: "General",
    question: "What is the Vision of Mineral View's Founders?",
    answerHtml: `<p>Our founders envisioned a data-driven platform that fosters collaboration among mineral owners. Our goal is to create a forum-based environment where questions are answered promptly, and valuable data is shared seamlessly, empowering stakeholders with the insights they need.</p>`,
  },
  {
    category: "General",
    question: "How does Mineral View Acquire its Information?",
    answerHtml: `<p>Mineral View accumulates the information from a variety of reputable platforms such as:</p><ul><li><strong>Government Data:</strong> We provide data reported by government agencies, which, while publicly available, can often be difficult to access. We accumulate the data from Texas’s RRC—the most authentic government platform for all types of mineral data.</li><li><strong>Interpretative Analysis:</strong> Using advanced mathematical, data-driven, and gridding algorithms similar to those utilized in the oil and gas industry, we deliver insightful interpretations. It is important to note that these analyses represent interpretations and should be treated as such.</li><li><strong>Unbiased Perspectives:</strong> Unlike buyers or sellers, our analyses are impartial, as we have no vested interest in inflating or deflating results.</li><li><strong>Additional Resources:</strong> We leverage satellite imagery, press releases, and community reports to identify new activity in specific areas.</li></ul>`,
  },
  {
    category: "General",
    question:
      "Why is Mineral View an Essential Tool for Those Interested in Oil and Gas Minerals?",
    answerHtml: `<ul><li><strong>Real-Time Monitoring:</strong> Mineral View tracks raw data in real time and delivers timely notifications, eliminating the need for users to manually search for updates.</li><li><strong>Advanced Tools:</strong> Our proprietary tools analyze raw data, presenting it in meaningful financial and spatial contexts for users.</li><li><strong>Community Collaboration:</strong> Mineral View provides a platform for users to share and access valuable information that may not be readily available in public domains. Users can create groups with shared interests, fostering collaboration and knowledge exchange.</li><li><strong>Industry Expertise:</strong> Our platform connects mineral owners with oil and gas professionals, enabling the sharing of specialized knowledge and services tailored to specific needs.</li></ul>`,
  },
  {
    category: "General",
    question: "What Services Does Mineral View Offer?",
    answerHtml: `<p>Mineral View offers a comprehensive suite of tools and insights for those involved in the oil and gas mineral industry. Our services include well performance tracking, mineral valuation, data visualization, and personalized reporting to empower mineral owners and professionals with actionable information.</p>`,
  },
  {
    category: "General",
    question: "How does Mineral View Benefit Mineral Owners Specifically?",
    answerHtml: `<p>Mineral View simplifies the complexities of mineral ownership by providing clear, accurate, and up-to-date information about well production, royalty payments, and market trends. This empowers mineral owners to make informed decisions and maximize their assets.</p>`,
  },
  {
    category: "General",
    question: "Is Mineral View a Subscription-Based Service?",
    answerHtml: `<p>Yes, Mineral View operates on a subscription model that provides users with continuous access to date updates, analytics tools, and support. We also offer tiered plans to suit various user needs.</p>`,
  },
  {
    category: "General",
    question: "How often is the Information Updated on Mineral View?",
    answerHtml: `<p>Our data is updated frequently, often on a monthly or weekly basis, depending on the type of information. This ensures that users always have access to the latest production and market data.</p>`,
  },
  {
    category: "General",
    question:
      "Is Mineral View Designed for Beginners or Experienced Professionals?",
    answerHtml: `<p>Mineral View is designed to cater to both beginners and seasoned professionals. Our intuitive interface and educational resources make it easy for new users to navigate, while advanced tools and insights provide significant value to industry experts.</p>`,
  },
  {
    category: "General",
    question:
      "Can Mineral View Assist with Legal or Financial Aspects of Mineral Ownership?",
    answerHtml: `<p>While Mineral View does not provide direct legal or financial advice, our data and insights can be invaluable in preparing for discussions with attorneys or financial advisors. Our platform helps you better understand your assets, royalties, and potential opportunities.</p>`,
  },
  {
    category: "General",
    question: "What Geographic Areas does Mineral View Cover?",
    answerHtml: `<p>Mineral View covers a wide range of regions where oil and gas production occurs, focusing on key producing basins, shale plays in the United States. If you are looking for specific geographic coverage, our team can provide detailed information.</p>`,
  },
  {
    category: "General",
    question:
      "Can Mineral View Help Me Determine the Value of My Mineral Rights?",
    answerHtml: `<p>Yes, Mineral View offers tools and insights that help you estimate the value of your mineral rights by analyzing production data, royalty trends and market conditions.</p>`,
  },
  {
    category: "General",
    question: "How Secure is My Information on Mineral View?",
    answerHtml: `<p>We take data security seriously. Mineral View employs state-of-the-art encryption and security protocols to protect user information and ensure privacy.</p>`,
  },
  {
    category: "General",
    question: "How does Mineral View Ensure the Accuracy of its Data?",
    answerHtml: `<p>Mineral View sources data from reliable and authoritative sources, including regulatory bodies, operators, and proprietary databases. Our team also cross-verifies data to ensure accuracy and reliability.</p>`,
  },
  {
    category: "General",
    question: "Does Mineral View Provide Training or Support for its Users?",
    answerHtml: `<p>Absolutely! Mineral View offers extensive resources, including tutorials, webinars, and a dedicated support team, to help users maximize the value of the platform.</p>`,
  },
  {
    category: "General",
    question: "How can I Get Started with Mineral View?",
    answerHtml: `<p>Getting started is simple. Visit our website to sign up for a free trial or schedule a demo with one of our experts. From there, you can explore our features and choose a plan that best fits your needs.</p>`,
  },
  {
    category: "General",
    question: "What Sets Mineral View Apart from Other Similar Tools?",
    answerHtml: `<p>Mineral View stands out for its user-friendly design, real-time data updates, and focus on providing actionable insights tailored to the unique needs of mineral owners and industry professionals.</p>`,
  },
  {
    category: "General",
    question: "Can I Customize the Data and Reports on Mineral View?",
    answerHtml: `<p>Yes, Mineral View offers customization options that allow users to tailor data views, generate specific reports, and set alerts for important updates.</p>`,
  },
  {
    category: "General",
    question: "Does Mineral View Offer a Mobile App?",
    answerHtml: `<p>Mineral View does not currently offer a mobile app; however, we are excited to announce that a mobile app will be launched soon.</p>`,
  },

  // ——— Products (16) ———
  {
    category: "Products",
    question: "What Types of Products Does Mineral View Offer?",
    answerHtml: `<p>The primary product of MView is “Mineral Data”. We offer “Mineral Data”, “Well Data”, and “Production Data”. These data you can access without visiting multiple platforms. Along with this data, Mineral View offers digital tools and services, including well performance tracking, forecasting tools, data visualization, and real-time market analytics.</p>`,
  },
  {
    category: "Products",
    question:
      "Are Mineral View's Products Suitable for Both Individuals and Businesses?",
    answerHtml: `<p>Yes, our products are designed to serve both individual mineral owners and businesses in the oil and gas sector, providing solutions tailored to their specific needs</p>`,
  },
  {
    category: "Products",
    question: "Do Mineral View's Products Include Mapping Tools?",
    answerHtml: `<p>Yes, our platform includes advanced mapping tools that allow users to view their mineral rights, nearby wells, and production trends in a visual format.</p>`,
  },
  {
    category: "Products",
    question: "Can I Get a Demo of Your Products Before Subscribing?",
    answerHtml: `<p>Absolutely! We offer a free demo of our products to help you understand their features and how they can benefit you. You can connect with us at any time through our <a href="/contact">Contact page</a>.</p>`,
  },
  {
    category: "Products",
    question: "Are Mineral View's Products Customizable?",
    answerHtml: `<p>Yes, our products are highly customizable. You can tailor the date views, reports, and alerts to meet your specific requirements and preferences.</p>`,
  },
  {
    category: "Products",
    question: "How do Your Products Help with Royalty Tracking?",
    answerHtml: `<p>Our royalty tracking tools provide detailed insights into payment trends, discrepancies, and production volumes, ensuring you receive accurate payments.</p>`,
  },
  {
    category: "Products",
    question: "Are there Mobile Versions of Your Products?",
    answerHtml: `<p>Yes, we provide mobile access to our products, allowing you to stay connected and manage your data on the go.</p>`,
  },
  {
    category: "Products",
    question: "Do your Products Integrate with Other Tools or Software?",
    answerHtml: `<p>Yes, Mineral View’s products are designed to integrate seamlessly with other tools, such as accounting software, to simplify your workflow.</p>`,
  },
  {
    category: "Products",
    question: "How User-Friendly are Your Products?",
    answerHtml: `<p>Our products are designed with user-friendliness in mind. Even if you are new to mineral ownership, our intuitive interface and support resources make it easy to get started.</p>`,
  },
  {
    category: "Products",
    question:
      "Can I Share Data or Reports Generated by Mineral View's Products?",
    answerHtml: `<p>Yes, you can easily share reports and data generated by our products with your team, advisors, or partners via email or downloadable files</p>`,
  },
  {
    category: "Products",
    question: "Do Your Products Provide Historical Data Analysis?",
    answerHtml: `<p>Yes, Mineral View’s tools allow you to analyze historical data, helping you identify trends and make informed decisions about your assets.</p>`,
  },
  {
    category: "Products",
    question: "How do I Know Which Product is Right for Me?",
    answerHtml: `<p>Our team can help you determine the best product for your needs based on your goals, level of expertise, and the type of assets you own. Contact us for any help through our <a href="/contact">Contact page</a>.</p>`,
  },
  {
    category: "Products",
    question: "Are Your Products Cloud-Based?",
    answerHtml: `<p>Yes, all our products are cloud-based, providing secure and reliable access to your data anytime, anywhere.</p>`,
  },
  {
    category: "Products",
    question: "Do You Offer a Subscription Plan for Accessing Your Products?",
    answerHtml: `<p>Yes, we offer flexible subscription plans that provide ongoing access to our products, with options to suit various needs and budgets.</p>`,
  },
  {
    category: "Products",
    question: "How do Your Products Handle Production Forecasting?",
    answerHtml: `<p>Our tools utilize advanced algorithms and industry data to provide accurate production forecasts, helping you plan and strategize effectively.</p>`,
  },
  {
    category: "Products",
    question: "Can I Upgrade My Product Subscription Plan as My Needs Grow?",
    answerHtml: `<p>Absolutely. We offer the flexibility to upgrade your plan as your requirements expand or change.</p>`,
  },

  // ——— Payments (3) ———
  {
    category: "Payments",
    question:
      "Are payments made monthly or annually and are they automatically renewed?",
    answerHtml: `<p>You can set up automatic renewal payments to be made monthly as well as annually. There is a discount for those subscribing to the annual plan. Your subscription will automatically renew until you choose to cancel your subscription. And at that time, your account will revert to the FREE version.</p>`,
  },
  {
    category: "Payments",
    question: "What payment methods do you accept?",
    answerHtml: `<p>Mineral View accepts credit card, PayPal, and/or electronic check payments.</p>`,
  },
  {
    category: "Payments",
    question: "Are my payment details secure?",
    answerHtml: `<p>Mineral View partners with Wells Fargo Cybersource to provide for safe/secure payment methods. Mineral View will never save any sensitive payment information on our servers. The payment information is saved with Wells Fargo Cybersource so that we can initiate automatic payment renewals.</p>`,
  },

  // ——— Pricing (4) ———
  {
    category: "Pricing",
    question: "Does Mineral View have a FREE version?",
    answerHtml: `<p>Yes, Mineral View provides a fully functioning FREE platform for our users. We believe that it is important for people to be connected and it is time for the “small guy” to have what they need to make informed decisions. We encourage all users to take part in the FREE version as well as the Community Forums where users can share and gather information with like minded mineral owners. Mineral View offers a FREE account and encourages all mineral owners to subscribe for this service.</p>`,
  },
  {
    category: "Pricing",
    question:
      "Can I upgrade my FREE account to benefit from additional services?",
    answerHtml: `<p>Yes, we will provide different paid services that people can upgrade their accounts to take part in more extensive services. But our goal is to provide most everything the typical mineral owner would need to evaluate their minerals, in the FREE version.</p>`,
  },
  {
    category: "Pricing",
    question:
      "Does Mineral View offer a Premium service with more functionality?",
    answerHtml: `<p>Mineral View does offer a paid add-on to the FREE account that will allow access to certain premium services.</p>`,
  },
  {
    category: "Pricing",
    question:
      "How does Mineral View make a profit if everybody elects to use the FREE account?",
    answerHtml: `<p>Mineral View believes that once users experience the added potential with the Premium Account, that people will gladly upgrade their account. Mineral View understands that not all Mineral Owners have a reason for the Premium Services. Thus, Mineral View reserves the right to advertise in order to help keep the site FREE for all Mineral Owners.</p>`,
  },

  // ——— Terminology (13) ———
  {
    category: "Terminology",
    question: "What is a Mineral Owner?",
    answerHtml: `<p>A mineral owner has the right to extract and use minerals found beneath the surface of a particular piece of land. Mineral Owners typically sign leases with Oil &amp; Gas operators that allow the operator to explore for oil &amp; gas on their lease.</p>`,
  },
  {
    category: "Terminology",
    question: "How does a Mineral Owner “claim” a lease within Mineral View?",
    answerHtml: `<ol><li>Each user can claim a single lease within Mineral View. One will locate the lease through the user interface and define the interest ownership that the user has for the lease. This will automatically give the user access to full activity reports on that lease, as well as links to the Community Forum that are most relevant.</li><li>A user can claim multiple leases as an add-on Premium Service to their Mineral View account.</li><li>It is important to accurately claim a lease, because all of the financial estimates as well as the activity reports and the Community Forum will be Lease specific.</li></ol>`,
  },
  {
    category: "Terminology",
    question: "What does Future Probability of a new well mean?",
    answerHtml: `<p>Mineral View uses a statistical and historical analysis of the data. We compare the surrounding lease activity as well as the current lease results to come up with a probability of a new well being drilled on the lease. Mineral View considers individual well performances, well spacing, nearby activity, operator activity, product prices, well fillings in our analysis to name a few factors that go into the consideration.</p>`,
  },
  {
    category: "Terminology",
    question: "What does Well Spacing (acre/well) mean?",
    answerHtml: `<p>Well spacing is determined by how many wells are drilled in a specific area. Due to horizontal drilling the definition of a single well is defined by a cumulative length of 8000 ft of horizontal lateral. This is roughly the average length of a horizontal well. This analysis is done both from the actual lease spacing (how many acres in a lease divided by the number of wells in a lease) as well as a spatial gridded analysis that considers all wells independent of which lease that they belong. It is possible, and very probable, that a spatially gridded acre/well will yield slightly different results than the actual lease’s acre/well calculation. This is an important distinction because it helps determine if a specific lease is more closely drilled than the surrounding leases and thus plays a role in the determination of the probability of future wells being drilled.</p>`,
  },
  {
    category: "Terminology",
    question: "What does EUR mean?",
    answerHtml: `<p>Estimated Ultimate Recovery - this is an estimate of the total volume that a well will produce in its lifetime.</p>`,
  },
  {
    category: "Terminology",
    question: "What does Allocated Production mean?",
    answerHtml: `<p>In Texas, the production of an oil lease is reported on the basis of the lease. It does not report individual well production. We use a proprietary analysis to estimate the individual allocated production for each well. The reason Allocated Production is important is that we need to place the production in a spatial sense when making estimates of future potential. For example, if the highly productive wells in the nearby lease are the ones nearest the lease of interest, then this will have a bearing on the probability of a new well estimate.</p>`,
  },
  {
    category: "Terminology",
    question: "What is a Decline Curve and why is it used?",
    answerHtml: `<p>A decline curve is a mathematical model that helps predict the steady state flow of oil/natural gas for a well. Unfortunately, in Texas the production is reported as a Lease rather than by individual wells. This adds increased complications that must be considered when a new well is added to the lease production. We use the standard ARPS’ Equation in our calculations. This equation is widely used and accepted in the Oil industry to calculate decline curves and, when applied correctly, it has a proven track record of providing relatively accurate results.</p>`,
  },
  {
    category: "Terminology",
    question: "What does “Reserves” mean?",
    answerHtml: `<p>Reserves are determined from taking EUR and subtracting the Produced volume. The reserves are the estimated “future” production for the life of a well/lease.</p>`,
  },
  {
    category: "Terminology",
    question: "What does “Produced” mean?",
    answerHtml: `<p>The produced volume is reported by the government agency and is what Mineral View uses in our calculations. For oil leases, the produced value is based on the lease which may have multiple wells. Mineral View uses proprietary software to allocate production to each individual well in the lease.</p>`,
  },
  {
    category: "Terminology",
    question: "What is the metric EUR/acre?",
    answerHtml: `<p>EUR stands for Estimated Ultimate Recovery which is the total oil that is estimated to produce from a well. This is determined from the Decline Curve calculations. We then determine the EUR per acre and then grid these values. This allows us to spatially determine the areas that are “proven” more productive than others. By gridding these values, it helps in better predicting the probability that a new well might be drilled nearby.</p>`,
  },
  {
    category: "Terminology",
    question: "What is the MVestimate?",
    answerHtml: `<p>Similar to how property values are determined, oil &amp; gas minerals have a value. The MVestimate value is the estimated value that Mineral View has determined for a lease. This value only considers the producing value. However, the potential value is only suggested based on the Probability of a new well being drilled on a lease. The higher the probability, then the higher this potential value might be for a given lease.</p>`,
  },
  {
    category: "Terminology",
    question: "What is the Spatio Temporal Analysis and what does it show?",
    answerHtml: `<p>Spatio Temporal Analysis in Oil and gas industry refers to the detailed understanding of the spatial (based on location) and temporal (based on time) patterns of the geological data. It is utilized to optimize the exploration process, production output and management. It shows the trends anomalies and interrelation between reservoir movement and resource distribution over time and space.</p>`,
  },
  {
    category: "Terminology",
    question: "What is the Community Forum?",
    answerHtml: `<p>The Community forum is the social platform where all the experts, stakeholders, investors and other people participates in the discussions, give advices and express their opinions on a particular topic.</p>`,
  },

  // ——— Portal Action (29) ———
  {
    category: "Portal Action",
    question: "How to create an account?",
    answerHtml: `<ol><li>Go to the website</li><li>Click on create account button</li><li>Enter all mandory fields &amp; click on create account button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to complete your registration?",
    answerHtml: `<ol><li>After creating an account complete your registration modal pages are displayed</li><li>You can claim lease</li><li>You can select your identity option</li><li>You can select notification preference</li><li>Verify your account from mail</li><li>Enter your address and click on save button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to login?",
    answerHtml: `<ol><li>Go to the website.</li><li>Enter your registered valid email id &amp; password.</li><li>Click on login button.</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to reset your password?",
    answerHtml: `<ol><li>Go to the website</li><li>Click on forget password</li><li>Enter your registered email id &amp; click on confirm button</li><li>Then go to the your email &amp; click on reset password button</li><li>Enter new &amp; confirm password then click on update password button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to add member?",
    answerHtml: `<ol><li>Go to Dashboard</li><li>Click on add neighbours button</li><li>You can search your neighbour by using county, operator, play type or entering name</li><li>After searched your neighbour you can click on follow button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to claim lease?",
    answerHtml: `<ol><li>Go to dashboard</li><li>Click on add lease button</li><li>Here you will search leases by 3 ways: search by lease name, search by mineral owner or search by map</li><li>Select county &amp; enter lease name</li><li>Enter decimal interest &amp; click on claim button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to post a question?",
    answerHtml: `<ol><li>Go to dashboard or from menu bar click on community</li><li>Click on add photos</li><li>Select category</li><li>Enter sub-category, discussion &amp; description</li><li>Click on post button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to add album or photos?",
    answerHtml: `<ol><li>Go to dashboard or from menu bar click on community</li><li>Click on add photos</li><li>Choose the photo type</li><li>Then from browser select the photo &amp; click on upload button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to add lease or group into watchlist?",
    answerHtml: `<ol><li>From left side menu bar click on my portfolio tab</li><li>Select lease or group, see at bottom &amp; click on add to watchlist button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to combine the lease?",
    answerHtml: `<ol><li>From left side menu bar click on my portfolio tab</li><li>Select more than one lease that has the same operator, location, and playtype</li><li>See at bottom &amp; click on combine button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to edit the decimal interest of any lease?",
    answerHtml: `<ol><li>From left side menu bar click on my portfolio tab</li><li>Select lease, see at bottom &amp; click on edit button</li><li>Enter decimal interest &amp; click on save changes button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to view any claimed lease on map?",
    answerHtml: `<ol><li>From left side menu bar click on my portfolio tab</li><li>Select lease, see at bottom &amp; click on view on map button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to view any lease on chart?",
    answerHtml: `<ol><li>From left side menu bar click on my portfolio tab</li><li>Select lease, see at bottom &amp; click on view on chart button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to remove lease or group from watchlist?",
    answerHtml: `<ol><li>From left side menu bar click on my portfolio tab</li><li>Select lease =&gt; watchlist</li><li>Select lease or group, see at bottom &amp; click on remove from watchlist button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to edit the group name?",
    answerHtml: `<ol><li>From left side menu bar click on my portfolio tab</li><li>Select group, see at bottom &amp; click on edit button</li><li>Enter new group name &amp; click on save changes button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to remove group from grouped lease?",
    answerHtml: `<ol><li>From left side menu bar click on my portfolio tab</li><li>Select lease =&gt; Grouped lease</li><li>Select group, see at bottom &amp; click on remove from group button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to search any particular lease report?",
    answerHtml: `<ol><li>From left side menu bar click on field report tab</li><li>Select county and enter lease name</li><li>Lease report is displayed</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to see the nearby lease information?",
    answerHtml: `<ol><li>From left side menu bar click on field report tab</li><li>Go to the bottom, you will see the nearby leases</li><li>Click on eye icon, you can view the lease report</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to change the profile photo?",
    answerHtml: `<ol><li>From left side menu bar click on community tab</li><li>Click on profile photo</li><li>Select profile photo &amp; click on submit button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to add categories into the group?",
    answerHtml: `<ol><li>From left side menu bar click on community tab</li><li>Click on groups</li><li>Select category &amp; click on join group button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to add bookmarks?",
    answerHtml: `<ol><li>From left side menu bar click on community tab</li><li>Click on groups</li><li>Select category, open any category &amp; click on bookmark icon</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How can I see the list of people who are following me?",
    answerHtml: `<ol><li>From left side menu bar click on community tab</li><li>Click on members</li><li>Select followers option from drop down menu</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How can I manage or respond to follow requests?",
    answerHtml: `<ol><li>From left side menu bar click on community tab</li><li>Click on members</li><li>Select follow request option from drop down menu</li><li>Click on accept button &amp; follow back button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How can I view my pending follow requests?",
    answerHtml: `<ol><li>From left side menu bar click on community tab</li><li>Click on members</li><li>Select pending request option from drop down menu</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to view any lease information on map?",
    answerHtml: `<ol><li>From left side menu bar click on map tab</li><li>You can apply my lease, county, all lease or play type filter</li><li>After applying filter you will see the leases on map</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to view any well information on map?",
    answerHtml: `<ol><li>From left side menu bar click on map tab</li><li>You can apply well, current operator, original operator, drilling date or completion date filter</li><li>After applying filter you will see the wells on map</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to edit the user details or account information?",
    answerHtml: `<ol><li>Top navigation bar click on user name</li><li>Click on setting text</li><li>User details is displayed then click on edit icon</li><li>Edit the information &amp; click on update details button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to change the account password?",
    answerHtml: `<ol><li>Top navigation bar click on user name then click on settings</li><li>Click on change password</li><li>Enter old password, new password &amp; confirm password then click on update button</li></ol>`,
  },
  {
    category: "Portal Action",
    question: "How to update notification message preference?",
    answerHtml: `<ol><li>Top navigation bar click on user name then click on settings</li><li>Click on notifications</li><li>Click on notification message preference</li><li>Click on edit button, select notified via &amp; click on update preference button</li></ol>`,
  },
];
