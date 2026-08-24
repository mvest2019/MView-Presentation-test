import { ResetSearchOnReload } from "@/app/_components/reset-search-on-reload";

/**
 * Exists only to host `ResetSearchOnReload` — see that file for why it cannot
 * live inside the page.
 */
export default function Layout({ children }: LayoutProps<"/blogs">) {
  return (
    <>
      <ResetSearchOnReload basePath="/blogs" />
      {children}
    </>
  );
}
