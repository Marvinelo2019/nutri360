#!/usr/bin/env python3
"""Generate the WHO paediatric growth migration from verified official XLSX files."""

from __future__ import annotations

import hashlib
import sys
import zipfile
from decimal import Decimal
from pathlib import Path
from xml.etree import ElementTree

SOURCES = [
    ("who2006-bmi-female", "who-2006", "bmi_for_age", "female", "day", "bmi-2006-female.xlsx", "d3817262a383cdd02553b004f1c6110527d30b729c70501d032e71caadc17529", "https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/body-mass-index-for-age/expanded-tables/bfa-girls-zscore-expanded-tables.xlsx"),
    ("who2006-bmi-male", "who-2006", "bmi_for_age", "male", "day", "bmi-2006-male.xlsx", "58dcb2abea0e04b1c4f8ad3511d05ec1bea03741f230ac127b93f929e4cc6fc8", "https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/body-mass-index-for-age/expanded-tables/bfa-boys-zscore-expanded-tables.xlsx"),
    ("who2006-height-female", "who-2006", "height_for_age", "female", "day", "height-2006-female.xlsx", "6aa2876319449a6b1f4d825848128902114ff53c67b92b86a0c5140846013059", "https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/length-height-for-age/expandable-tables/lhfa-girls-zscore-expanded-tables.xlsx"),
    ("who2006-height-male", "who-2006", "height_for_age", "male", "day", "height-2006-male.xlsx", "c4b1c9029ab9751a5f0888e32f35c7c0287a16d361885cf911ecf23b3f7f6b4f", "https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/length-height-for-age/expandable-tables/lhfa-boys-zscore-expanded-tables.xlsx"),
    ("who2006-weight-female", "who-2006", "weight_for_age", "female", "day", "weight-2006-female.xlsx", "ee3ae12cb96c6c5541cdf43665c03ce6c984f877859a183a5f6104eb06a49a6e", "https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/expanded-tables/wfa-girls-zscore-expanded-tables.xlsx"),
    ("who2006-weight-male", "who-2006", "weight_for_age", "male", "day", "weight-2006-male.xlsx", "b5b4748c6bfa5230e2eddafa1767629c349178b08d457f400b59422b8bfef86c", "https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/expanded-tables/wfa-boys-zscore-expanded-tables.xlsx"),
    ("who2007-bmi-female", "who-2007", "bmi_for_age", "female", "month", "bmi-2007-female.xlsx", "66f5c6284b44579ad6135fc639f22c09e36fe5a695b04390377113f6a00deb72", "https://cdn.who.int/media/docs/default-source/child-growth/growth-reference-5-19-years/bmi-for-age-%285-19-years%29/bmi-girls-z-who-2007-exp.xlsx"),
    ("who2007-bmi-male", "who-2007", "bmi_for_age", "male", "month", "bmi-2007-male.xlsx", "0a60849673f34a06b8e2fe4defe5d00348de687b6c9fce0278f1525fff89eb6d", "https://cdn.who.int/media/docs/default-source/child-growth/growth-reference-5-19-years/bmi-for-age-%285-19-years%29/bmi-boys-z-who-2007-exp.xlsx"),
    ("who2007-height-female", "who-2007", "height_for_age", "female", "month", "height-2007-female.xlsx", "df07ee16d3d2916569f1d869b7c874d7b880a41321d871215ed0254cb16679b3", "https://cdn.who.int/media/docs/default-source/child-growth/growth-reference-5-19-years/height-for-age-%285-19-years%29/hfa-girls-z-who-2007-exp.xlsx"),
    ("who2007-height-male", "who-2007", "height_for_age", "male", "month", "height-2007-male.xlsx", "d78fa8cafcab77dcb5f03d71506d92bdcb28f89c642816b6bb0eef466b007466", "https://cdn.who.int/media/docs/default-source/child-growth/growth-reference-5-19-years/height-for-age-%285-19-years%29/hfa-boys-z-who-2007-exp.xlsx"),
    ("who2007-weight-female", "who-2007", "weight_for_age", "female", "month", "weight-2007-female.xlsx", "d747e068fcef4238cbaf1c201dd7788f266d9903685f4495360614eed0153562", "https://cdn.who.int/media/docs/default-source/child-growth/growth-reference-5-19-years/weight-for-age-%285-10-years%29/hfa-girls-z-who-2007-exp.xlsx"),
    ("who2007-weight-male", "who-2007", "weight_for_age", "male", "month", "weight-2007-male.xlsx", "a6ed0d9f3cfa209747afe49f7503b7cc24a1be6b6a8e7222e85a36b7850cb99f", "https://cdn.who.int/media/docs/default-source/child-growth/growth-reference-5-19-years/weight-for-age-%285-10-years%29/hfa-boys-z-who-2007-exp.xlsx"),
]

NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def rows(path: Path) -> list[tuple[int, str, str, str]]:
    with zipfile.ZipFile(path) as workbook:
        root = ElementTree.fromstring(workbook.read("xl/worksheets/sheet1.xml"))
    result = []
    for row in root.findall(".//x:sheetData/x:row", NS)[1:]:
        values: dict[str, str] = {}
        for cell in row.findall("x:c", NS):
            value = cell.find("x:v", NS)
            if value is not None and value.text is not None:
                values[cell.attrib["r"][0]] = value.text
        if all(column in values for column in "ABCD"):
            result.append(
                (
                    int(Decimal(values["A"])),
                    format(Decimal(values["B"]), "f"),
                    format(Decimal(values["C"]), "f"),
                    format(Decimal(values["D"]), "f"),
                )
            )
    return result


def quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: generate_who_growth_migration.py XLSX_DIR OUTPUT_SQL")
    source_dir = Path(sys.argv[1])
    output = Path(sys.argv[2])
    parsed: dict[str, list[tuple[int, str, str, str]]] = {}
    for source_id, _, _, _, _, filename, expected_hash, _ in SOURCES:
        path = source_dir / filename
        actual_hash = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual_hash != expected_hash:
            raise SystemExit(f"SHA-256 mismatch for {filename}: {actual_hash}")
        parsed[source_id] = rows(path)

    prefix = Path(__file__).with_name("who_growth_migration_prefix.sql").read_text()
    suffix = Path(__file__).with_name("who_growth_migration_suffix.sql").read_text()
    chunks = [prefix.rstrip(), "\n"]
    source_values = []
    for source_id, version, indicator, sex, age_unit, _, digest, url in SOURCES:
        source_values.append(
            f"({quote(source_id)},{quote(version)},{quote(indicator)},{quote(sex)},{quote(age_unit)},{quote(url)},{quote(digest)})"
        )
    chunks.append(
        "insert into public.who_growth_reference_sources "
        "(id,reference_version,indicator,reference_sex,age_unit,source_url,source_sha256) values\n"
        + ",\n".join(source_values)
        + ";\n"
    )
    for source_id, values in parsed.items():
        for start in range(0, len(values), 500):
            batch = values[start : start + 500]
            sql_values = ",\n".join(
                f"({quote(source_id)},{age},{l},{m},{s})" for age, l, m, s in batch
            )
            chunks.append(
                "insert into public.who_growth_reference_parameters "
                "(source_id,age_value,l_value,m_value,s_value) values\n"
                + sql_values
                + ";\n"
            )
    chunks.append(suffix.lstrip())
    output.write_text("\n".join(chunks))
    print(f"generated {output} with {sum(map(len, parsed.values()))} parameter rows")


if __name__ == "__main__":
    main()
