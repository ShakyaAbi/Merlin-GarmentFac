import { cx } from "@/utils/cx";
import type { NavItemDividerType, NavItemType } from "../config";
import { NavItemBase } from "./nav-item";

interface NavListProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** Additional CSS classes to apply to the list. */
    className?: string;
    /** Render items in icon-only mode for collapsed sidebars. */
    iconOnly?: boolean;
    /** List of items to display. */
    items: (NavItemType | NavItemDividerType)[];
}

const isPathActive = (candidate?: string, activeUrl?: string) => {
    if (!candidate || !activeUrl) return false;
    return activeUrl === candidate || activeUrl.startsWith(`${candidate}/`);
};

export const NavList = ({ activeUrl, items, className, iconOnly = false }: NavListProps) => {
    return (
        <ul className={cx("flex flex-col px-4 pt-5", className)}>
            {items.map((item, index) => {
                if (item.divider) {
                    return (
                        <li key={index} className="w-full px-0.5 py-2">
                            <hr className="h-px w-full border-none bg-border-secondary" />
                        </li>
                    );
                }

                if (item.items?.length) {
                    return (
                        <details key={item.label} open={isPathActive(item.href, activeUrl) || item.items.some((subItem) => isPathActive(subItem.href, activeUrl))} className="appearance-none py-0.25">
                            <NavItemBase href={item.href} badge={item.badge} icon={item.icon} type="collapsible" iconOnly={iconOnly}>
                                {item.label}
                            </NavItemBase>

                            <dd>
                                <ul className="pb-1">
                                    {item.items.map((childItem) => (
                                        <li key={childItem.label} className="py-0.25">
                                            <NavItemBase
                                                href={childItem.href}
                                                badge={childItem.badge}
                                                type="collapsible-child"
                                                current={isPathActive(childItem.href, activeUrl)}
                                                iconOnly={iconOnly}
                                            >
                                                {childItem.label}
                                            </NavItemBase>
                                        </li>
                                    ))}
                                </ul>
                            </dd>
                        </details>
                    );
                }

                return (
                    <li key={item.label} className="py-px">
                        <NavItemBase type="link" badge={item.badge} icon={item.icon} href={item.href} current={isPathActive(item.href, activeUrl)} iconOnly={iconOnly}>
                            {item.label}
                        </NavItemBase>
                    </li>
                );
            })}
        </ul>
    );
};
