import { type MapWellPermit } from "@/lib/map-api";

/*
 * The permit response, turned into the rows and the table the view draws.
 *
 * Formatting only, kept out of the component for the same reason as
 * `well-summary-fields.ts`: units, separators and the em dash for a field the
 * filing leaves empty are a different job from layout.
 *
 * The permit record carries no county — the map's own value stands in for it,
 * since that is the county the well was clicked in.
 */

export type Row = { label: string; value: string };

function text(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function yesNo(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value ? "Yes" : "No";
}

/** `31.77071477, -95.4488` → `31.770715, -95.448805`, as a filing writes it. */
function coordinates(
  lat: number | null | undefined,
  lon: number | null | undefined,
): string {
  if (lat === null || lat === undefined || lon === null || lon === undefined) {
    return "—";
  }
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

export function permitFields(permit: MapWellPermit, county: string) {
  const { identity, lease, wellType, operator, location, nearestWell } = permit;
  const filing = permit.permit;

  return {
    header: {
      wellNumber: text(identity.wellNumber),
      api: text(identity.api),
      filingPurpose: text(identity.filingPurpose),
      status: text(identity.permitStatus),
    },

    leaseWell: [
      { label: "Lease Name", value: text(lease?.leaseName) },
      { label: "County", value: text(county) },
      { label: "District", value: text(lease?.district) },
    ] satisfies Row[],

    typeDirection: [
      { label: "Well Type", value: text(wellType?.wtype) },
      { label: "Direction", value: text(wellType?.direction) },
      { label: "New Permit", value: yesNo(identity.isNewPermit) },
    ] satisfies Row[],

    permitInformation: [
      { label: "Filing Purpose", value: text(identity.filingPurpose) },
      { label: "Filing Type", value: text(identity.filingType) },
      { label: "Permit Date", value: text(filing?.permitDate) },
    ] satisfies Row[],

    operatorField: [
      {
        label: "Operator",
        value: operator?.operatorNumber
          ? `${text(operator.operator)} (${operator.operatorNumber})`
          : text(operator?.operator),
      },
      {
        label: "Field Name",
        value: text(operator?.fieldName ?? lease?.fieldName),
      },
      { label: "Reservoir", value: text(operator?.reservoir ?? lease?.play) },
      {
        label: "Field No.",
        value: text(operator?.fieldNumber ?? lease?.fieldNumber),
      },
    ] satisfies Row[],

    coordinates: [
      {
        label: "Surface",
        value: coordinates(location?.lat, location?.lon),
      },
      {
        label: "Bottom-Hole",
        value: coordinates(location?.bhLat, location?.bhLon),
      },
    ] satisfies Row[],

    nearestWell: [
      {
        label: "Distance",
        value:
          nearestWell?.distanceMiles === null ||
          nearestWell?.distanceMiles === undefined
            ? "—"
            : `${nearestWell.distanceMiles} miles`,
      },
      { label: "Direction", value: text(nearestWell?.direction) },
    ] satisfies Row[],

    /*
     * The filing as one row, in the record's own column order.
     *
     * No Submit Date: the response carries the date the permit was issued and
     * the basis for it, not the date it was filed.
     */
    table: [
      { label: "API Number", value: text(identity.api) },
      { label: "Well No.", value: text(identity.wellNumber) },
      { label: "Lease Name", value: text(lease?.leaseName) },
      { label: "Status No.", value: text(identity.statusNumber) },
      {
        label: "Permit Status",
        value: text(identity.permitStatus),
        tone: "green" as const,
      },
      { label: "Filing Purpose", value: text(identity.filingPurpose) },
      { label: "New Permit", value: yesNo(identity.isNewPermit) },
      { label: "Permit Date", value: text(filing?.permitDate) },
      { label: "Issued Date", value: text(filing?.issuedDate) },
    ],
  };
}

export type PermitFields = ReturnType<typeof permitFields>;
