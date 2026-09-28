import WidgetKit
import SwiftUI

struct OrthoTypikonEntry: TimelineEntry {
    let date: Date
    let julianDate: String
    let saints: String
}

struct OrthoTypikonProvider: TimelineProvider {
    private let saints2026: [String: String] = [
        "2026-01-01": "القديس باسيليوس الكبير",
        "2026-01-06": "القديس يوحنا المعمدان",
        "2026-08-15": "والدة الإله الفائقة القداسة",
        "2026-08-25": "القديسة مريم المصرية · القديس نيقولاوس",
        "2026-09-14": "القديس كبريانوس الشهيد",
        "2026-12-25": "القديس إسطفانوس الشهيد الأول"
    ]

    func placeholder(in context: Context) -> OrthoTypikonEntry {
        makeEntry(for: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (OrthoTypikonEntry) -> Void) {
        completion(makeEntry(for: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<OrthoTypikonEntry>) -> Void) {
        let now = Date()
        let entry = makeEntry(for: now)
        let nextMidnight = Calendar.current.nextDate(after: now, matching: DateComponents(hour: 0, minute: 1), matchingPolicy: .nextTime) ?? now.addingTimeInterval(86400)
        completion(Timeline(entries: [entry], policy: .after(nextMidnight)))
    }

    private func makeEntry(for date: Date) -> OrthoTypikonEntry {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let civilKey = formatter.string(from: date)
        let julian = Calendar.current.date(byAdding: .day, value: -13, to: date) ?? date
        let saints = saints2026[civilKey] ?? "قديسو اليوم بحسب السنكسار"
        return OrthoTypikonEntry(date: date, julianDate: formatter.string(from: julian), saints: saints)
    }
}

struct OrthoTypikonWidgetView: View {
    var entry: OrthoTypikonProvider.Entry
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(alignment: .trailing, spacing: 9) {
            HStack {
                Text("OrthoTypikon").font(.caption2).foregroundStyle(.secondary)
                Spacer()
                Text("اليولياني \(entry.julianDate)").font(.caption2).foregroundStyle(Color(red: 0.89, green: 0.73, blue: 0.40))
            }
            Spacer()
            Text("«سلامي أترك لكم. سلامي أعطيكم.»")
                .font(.headline)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: .infinity, alignment: .trailing)
            Text("يوحنا ١٤:٢٧").font(.caption2).foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .trailing)
            Text("✦ \(entry.saints)").font(.caption).foregroundStyle(Color(red: 0.89, green: 0.73, blue: 0.40))
                .lineLimit(2).frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding()
        .containerBackground(colorScheme == .dark ? Color(red: 0.09, green: 0.20, blue: 0.29) : Color(red: 1.0, green: 0.99, blue: 0.97), for: .widget)
        .widgetURL(URL(string: "orthotypikon://widget"))
    }
}

struct OrthoTypikonDailyWidget: Widget {
    let kind = "OrthoTypikonDaily"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: OrthoTypikonProvider()) { entry in
            OrthoTypikonWidgetView(entry: entry)
        }
        .configurationDisplayName("OrthoTypikon اليوم")
        .description("آية اليوم والتاريخ اليولياني وقديسو اليوم.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}